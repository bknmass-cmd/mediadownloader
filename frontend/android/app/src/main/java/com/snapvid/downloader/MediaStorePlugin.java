package com.snapvid.downloader;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.media.MediaScannerConnection;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "MediaStore")
public class MediaStorePlugin extends Plugin {

    @PluginMethod
    public void saveToGallery(PluginCall call) {
        String base64Data = call.getString("base64Data");
        String fileName = call.getString("fileName", "snapvid_" + System.currentTimeMillis());
        String mimeType = call.getString("mimeType", "image/jpeg");
        String subfolder = call.getString("subfolder", "Pictures/SnapVid/Images");

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("base64Data is required");
            return;
        }

        try {
            byte[] fileBytes = Base64.decode(base64Data, Base64.DEFAULT);
            Context context = getContext();
            ContentResolver resolver = context.getContentResolver();
            Uri targetUri = null;

            boolean isVideo = mimeType.startsWith("video");
            Uri collection = isVideo
                    ? MediaStore.Video.Media.EXTERNAL_CONTENT_URI
                    : MediaStore.Images.Media.EXTERNAL_CONTENT_URI;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, subfolder);
                values.put(MediaStore.MediaColumns.IS_PENDING, 1);

                targetUri = resolver.insert(collection, values);
                if (targetUri == null) {
                    call.reject("Failed to create MediaStore entry");
                    return;
                }

                try (OutputStream os = resolver.openOutputStream(targetUri)) {
                    if (os != null) {
                        os.write(fileBytes);
                        os.flush();
                    }
                }

                values.clear();
                values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                resolver.update(targetUri, values, null, null);
            } else {
                // Legacy Android (< Q)
                File baseDir = isVideo 
                    ? new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES), "SnapVid/Videos")
                    : new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "SnapVid/Images");
                
                if (!baseDir.exists()) {
                    baseDir.mkdirs();
                }

                File destFile = new File(baseDir, fileName);
                try (FileOutputStream fos = new FileOutputStream(destFile)) {
                    fos.write(fileBytes);
                    fos.flush();
                }

                MediaScannerConnection.scanFile(
                    context,
                    new String[]{destFile.getAbsolutePath()},
                    new String[]{mimeType},
                    null
                );

                targetUri = Uri.fromFile(destFile);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("uri", targetUri != null ? targetUri.toString() : "");
            call.resolve(ret);

        } catch (Exception e) {
            call.reject("Failed to save media to gallery: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void getGalleryMedia(PluginCall call) {
        String subfolder = call.getString("subfolder", "Pictures/SnapVid/Images");
        boolean isVideo = subfolder.toLowerCase().contains("movie") || subfolder.toLowerCase().contains("video");

        JSArray items = new JSArray();
        Context context = getContext();

        try {
            Uri collection = isVideo
                    ? MediaStore.Video.Media.EXTERNAL_CONTENT_URI
                    : MediaStore.Images.Media.EXTERNAL_CONTENT_URI;

            String[] projection = new String[]{
                    MediaStore.MediaColumns._ID,
                    MediaStore.MediaColumns.DISPLAY_NAME,
                    MediaStore.MediaColumns.DATE_ADDED
            };

            String selection = null;
            String[] selectionArgs = null;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                selection = MediaStore.MediaColumns.RELATIVE_PATH + " LIKE ?";
                selectionArgs = new String[]{subfolder + "%"};
            }

            String sortOrder = MediaStore.MediaColumns.DATE_ADDED + " DESC";

            try (Cursor cursor = context.getContentResolver().query(
                    collection,
                    projection,
                    selection,
                    selectionArgs,
                    sortOrder
            )) {
                if (cursor != null) {
                    int idCol = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID);
                    int nameCol = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.DISPLAY_NAME);
                    int dateCol = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.DATE_ADDED);

                    while (cursor.moveToNext()) {
                        long id = cursor.getLong(idCol);
                        String name = cursor.getString(nameCol);
                        long date = cursor.getLong(dateCol);

                        Uri contentUri = Uri.withAppendedPath(collection, String.valueOf(id));

                        JSObject item = new JSObject();
                        item.put("id", String.valueOf(id));
                        item.put("name", name);
                        item.put("uri", contentUri.toString());
                        item.put("date", date * 1000L);
                        items.put(item);
                    }
                }
            }

            JSObject ret = new JSObject();
            ret.put("items", items);
            call.resolve(ret);

        } catch (Exception e) {
            call.reject("Failed to query gallery media: " + e.getMessage(), e);
        }
    }
}
