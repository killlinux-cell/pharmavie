import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:pharmavie_mobile/core/api/api_client.dart';
import 'package:pharmavie_mobile/core/config/app_config.dart';
import 'package:pharmavie_mobile/core/services/camera_permission_service.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/core/utils/order_status.dart';
import 'package:pharmavie_mobile/core/widgets/feature_scaffold.dart';
import 'package:pharmavie_mobile/features/auth/presentation/auth_screen.dart';

class DigitalPrescriptionsScreen extends StatefulWidget {
  const DigitalPrescriptionsScreen({super.key});

  @override
  State<DigitalPrescriptionsScreen> createState() => _DigitalPrescriptionsScreenState();
}

class _DigitalPrescriptionsScreenState extends State<DigitalPrescriptionsScreen> {
  final _api = ApiClient();
  final _picker = ImagePicker();
  List<dynamic> _prescriptions = [];
  bool _loading = true;
  bool _uploading = false;
  String? _error;

  static const _steps = [
    ('Importer', 'Photographiez ou importez votre ordonnance'),
    ('Validation', 'La pharmacie vérifie le médicament et le dosage'),
    ('Commande', 'Ajoutez les produits validés au panier'),
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final token = await _api.getToken();
      if (token == null) {
        setState(() {
          _prescriptions = [];
          _loading = false;
        });
        return;
      }
      final res = await _api.get('/prescriptions');
      setState(() {
        _prescriptions = (res['data'] as List?) ?? [];
        _loading = false;
      });
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Future<void> _ensureAuth() async {
    final token = await _api.getToken();
    if (token != null) return;
    if (!mounted) return;
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => AuthScreen(onAuthenticated: () {
          Navigator.pop(context);
          _load();
        }),
      ),
    );
  }

  Future<void> _pickAndUpload(ImageSource source) async {
    await _ensureAuth();
    if (!mounted) return;
    if (await _api.getToken() == null) return;

    final permitted = source == ImageSource.camera
        ? await CameraPermissionService.ensureCamera(context)
        : await CameraPermissionService.ensureGallery(context);
    if (!permitted || !mounted) return;

    final picked = await _picker.pickImage(
      source: source,
      maxWidth: 2000,
      imageQuality: 85,
    );
    if (picked == null) return;

    setState(() => _uploading = true);
    try {
      final mime = _mimeForPickedImage(picked);
      await _api.uploadFile('/prescriptions', picked.path, contentType: mime);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ordonnance envoyée — en attente de validation')),
        );
      }
      await _load();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  String _mimeForPickedImage(XFile picked) {
    final reported = picked.mimeType?.toLowerCase();
    if (reported != null &&
        reported.startsWith('image/') &&
        reported != 'application/octet-stream') {
      return reported;
    }
    final ext = picked.path.split('.').last.toLowerCase();
    switch (ext) {
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'heic':
        return 'image/heic';
      case 'heif':
        return 'image/heif';
      default:
        return 'image/jpeg';
    }
  }

  void _showImportDialog() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined, color: AppColors.brand600),
              title: const Text('Prendre une photo'),
              subtitle: const Text('Utiliser l\'appareil photo'),
              onTap: () {
                Navigator.pop(ctx);
                _pickAndUpload(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined, color: AppColors.brand600),
              title: const Text('Choisir depuis la galerie'),
              subtitle: const Text('Importer une image existante'),
              onTap: () {
                Navigator.pop(ctx);
                _pickAndUpload(ImageSource.gallery);
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return FeatureScaffold(
      title: 'Ordonnances numériques',
      subtitle: 'Médicaments sur ordonnance · workflow sécurisé',
      badge: 'Actif',
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                children: [
                  if (_error != null) ...[
                    Text(_error!, style: const TextStyle(color: AppColors.red600)),
                    const SizedBox(height: 12),
                  ],
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      children: [
                        Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(color: AppColors.brand50, borderRadius: BorderRadius.circular(20)),
                          child: _uploading
                              ? const Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator(strokeWidth: 2))
                              : const Icon(Icons.add_a_photo_outlined, size: 36, color: AppColors.brand600),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _prescriptions.isEmpty ? 'Aucune ordonnance enregistrée' : '${_prescriptions.length} ordonnance(s)',
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Importez une ordonnance pour commander des médicaments soumis à prescription.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: AppColors.slate500, fontSize: 13),
                        ),
                        const SizedBox(height: 20),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: _uploading ? null : _showImportDialog,
                            icon: const Icon(Icons.add_a_photo_outlined),
                            label: Text(_uploading ? 'Envoi en cours…' : 'Importer une ordonnance'),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                              side: const BorderSide(color: AppColors.brand600),
                              foregroundColor: AppColors.brand700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (_prescriptions.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    const Text('Mes ordonnances', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 12),
                    ..._prescriptions.map((p) => _PrescriptionTile(
                          data: p as Map<String, dynamic>,
                          onOrder: () {
                            Navigator.popUntil(context, (route) => route.isFirst);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Recherchez vos médicaments Rx sur l\'accueil — votre ordonnance validée sera proposée au checkout'),
                                duration: Duration(seconds: 4),
                              ),
                            );
                          },
                        )),
                  ],
                  const SizedBox(height: 24),
                  const Text('Comment ça marche', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 12),
                  ...List.generate(_steps.length, (i) {
                    final (title, desc) = _steps[i];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          CircleAvatar(
                            radius: 14,
                            backgroundColor: AppColors.brand50,
                            child: Text('${i + 1}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.brand700)),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                                Text(desc, style: const TextStyle(fontSize: 13, color: AppColors.slate500)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                  const FeatureBanner(
                    icon: Icons.security,
                    title: 'Conformité réglementaire',
                    message: 'Seuls les médicaments autorisés après validation pharmacien pourront être commandés.',
                    color: AppColors.purple600,
                  ),
                ],
              ),
            ),
    );
  }
}

class _PrescriptionTile extends StatelessWidget {
  const _PrescriptionTile({required this.data, this.onOrder});

  final Map<String, dynamic> data;
  final VoidCallback? onOrder;

  Color _statusColor(String status) {
    switch (status) {
      case 'VALIDATED':
        return AppColors.brand700;
      case 'REJECTED':
        return AppColors.red600;
      default:
        return AppColors.amber600;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'VALIDATED':
        return 'Validée';
      case 'REJECTED':
        return 'Refusée';
      default:
        return 'En attente';
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = data['status'] as String? ?? 'PENDING';
    final imageUrl = data['imageUrl'] as String? ?? '';
    final createdAt = data['createdAt'] as String?;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (imageUrl.isNotEmpty)
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
              child: Image.network(
                mediaUrl(imageUrl),
                height: 160,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  height: 120,
                  color: AppColors.surfaceMuted,
                  child: const Icon(Icons.broken_image_outlined, color: AppColors.slate400),
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_statusLabel(status), style: TextStyle(fontWeight: FontWeight.w600, color: _statusColor(status))),
                          if (createdAt != null)
                            Text(formatDate(createdAt), style: const TextStyle(fontSize: 12, color: AppColors.slate400)),
                          if (data['rejectReason'] != null)
                            Text(data['rejectReason'] as String, style: const TextStyle(fontSize: 12, color: AppColors.red600)),
                        ],
                      ),
                    ),
                    Icon(
                      status == 'VALIDATED' ? Icons.check_circle : status == 'REJECTED' ? Icons.cancel_outlined : Icons.hourglass_top,
                      color: _statusColor(status),
                    ),
                  ],
                ),
                if (status == 'VALIDATED' && onOrder != null) ...[
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    onPressed: onOrder,
                    icon: const Icon(Icons.shopping_bag_outlined),
                    label: const Text('Commander avec cette ordonnance'),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
