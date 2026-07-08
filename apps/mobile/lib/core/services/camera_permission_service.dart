import 'dart:io';

import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

class CameraPermissionService {
  CameraPermissionService._();

  static Future<bool> ensureCamera(BuildContext context) async {
    final granted = await _request(Permission.camera);
    if (granted) return true;
    if (context.mounted) {
      await _showDeniedDialog(context: context, label: 'caméra', permission: Permission.camera);
    }
    return false;
  }

  static Future<bool> ensureGallery(BuildContext context) async {
    if (Platform.isIOS) {
      final granted = await _request(Permission.photos);
      if (granted) return true;
      if (context.mounted) {
        await _showDeniedDialog(context: context, label: 'galerie photos', permission: Permission.photos);
      }
      return false;
    }

    final photos = await Permission.photos.request();
    if (photos.isGranted || photos.isLimited) return true;

    final storage = await Permission.storage.request();
    if (storage.isGranted) return true;

    if (context.mounted) {
      await _showDeniedDialog(context: context, label: 'galerie photos', permission: Permission.photos);
    }
    return false;
  }

  static Future<bool> _request(Permission permission) async {
    var status = await permission.status;
    if (status.isGranted || status.isLimited) return true;
    if (status.isPermanentlyDenied) return false;
    status = await permission.request();
    return status.isGranted || status.isLimited;
  }

  static Future<void> _showDeniedDialog({
    required BuildContext context,
    required String label,
    required Permission permission,
  }) async {
    final permanently = await permission.status == PermissionStatus.permanentlyDenied;
    if (!context.mounted) return;

    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Accès $label requis'),
        content: Text(
          permanently
              ? 'Autorisez l\'accès à la $label dans les paramètres de l\'application PharmaVie.'
              : 'PharmaVie a besoin de la $label pour scanner un code-barres ou photographier une ordonnance.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          if (permanently)
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                openAppSettings();
              },
              child: const Text('Ouvrir les paramètres'),
            ),
        ],
      ),
    );
  }
}
