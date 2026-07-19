import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/api/api_client.dart';
import 'package:pharmavie_mobile/core/services/local_prefs_service.dart';
import 'package:pharmavie_mobile/core/services/location_service.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/core/widgets/feature_scaffold.dart';
import 'package:pharmavie_mobile/features/explore/presentation/screens/pharmacy_detail_screen.dart';

class FavoritePharmaciesScreen extends StatefulWidget {
  const FavoritePharmaciesScreen({super.key});

  @override
  State<FavoritePharmaciesScreen> createState() => _FavoritePharmaciesScreenState();
}

class _FavoritePharmaciesScreenState extends State<FavoritePharmaciesScreen> {
  final _api = ApiClient();
  List<dynamic> _all = [];
  Set<String> _favoriteIds = {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final favIds = await LocalPrefsService.instance.getFavoritePharmacyIds();
    try {
      final loc = await LocationService.instance.getLocation();
      final res = await _api.get('/pharmacies?${loc.queryParams}&radius=50', auth: false);
      setState(() {
        _all = (res['data'] as List?) ?? [];
        _favoriteIds = favIds.toSet();
        _loading = false;
      });
    } on ApiException {
      setState(() => _loading = false);
    }
  }

  Future<void> _toggle(String id) async {
    await LocalPrefsService.instance.toggleFavoritePharmacy(id);
    final favIds = await LocalPrefsService.instance.getFavoritePharmacyIds();
    setState(() => _favoriteIds = favIds.toSet());
  }

  List<dynamic> get _favorites => _all.where((p) => _favoriteIds.contains(p['id'])).toList();

  @override
  Widget build(BuildContext context) {
    return FeatureScaffold(
      title: 'Pharmacies favorites',
      subtitle: 'Accès rapide à vos officines préférées',
      badge: 'Compte',
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              children: [
                if (_favorites.isEmpty) ...[
                  const FeatureBanner(
                    icon: Icons.favorite_border,
                    title: 'Aucune favorite',
                    message: 'Ajoutez des pharmacies depuis la carte interactive ou la liste ci-dessous.',
                  ),
                ] else ...[
                  Text('${_favorites.length} favorite(s)', style: const TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  ..._favorites.map((p) => _PharmacyTile(
                        pharmacy: p as Map<String, dynamic>,
                        isFavorite: true,
                        onToggle: () => _toggle(p['id'] as String),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => PharmacyDetailScreen(
                              pharmacyId: p['id'] as String,
                              initialPharmacy: p as Map<String, dynamic>,
                            ),
                          ),
                        ),
                      )),
                  const SizedBox(height: 20),
                ],
                const Text('Toutes les pharmacies', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 12),
                ..._all.map((p) {
                  final id = p['id'] as String;
                  return _PharmacyTile(
                    pharmacy: p as Map<String, dynamic>,
                    isFavorite: _favoriteIds.contains(id),
                    onToggle: () => _toggle(id),
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => PharmacyDetailScreen(
                          pharmacyId: id,
                          initialPharmacy: p as Map<String, dynamic>,
                        ),
                      ),
                    ),
                  );
                }),
              ],
            ),
    );
  }
}

class _PharmacyTile extends StatelessWidget {
  const _PharmacyTile({
    required this.pharmacy,
    required this.isFavorite,
    required this.onToggle,
    required this.onTap,
  });

  final Map<String, dynamic> pharmacy;
  final bool isFavorite;
  final VoidCallback onToggle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isFavorite ? AppColors.brand600.withValues(alpha: 0.3) : AppColors.border),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              const Icon(Icons.local_pharmacy, color: AppColors.brand600),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(pharmacy['name'] as String? ?? '', style: const TextStyle(fontWeight: FontWeight.w500)),
                    Text(pharmacy['street'] as String? ?? '', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                    const Text('Commander', style: TextStyle(fontSize: 11, color: AppColors.brand700, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              IconButton(
                onPressed: onToggle,
                icon: Icon(isFavorite ? Icons.favorite : Icons.favorite_border, color: isFavorite ? AppColors.red600 : AppColors.slate400),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
