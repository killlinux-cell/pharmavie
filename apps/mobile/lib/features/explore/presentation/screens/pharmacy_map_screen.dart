import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:pharmavie_mobile/core/api/api_client.dart';
import 'package:pharmavie_mobile/core/services/local_prefs_service.dart';
import 'package:pharmavie_mobile/core/services/location_service.dart';
import 'package:pharmavie_mobile/core/utils/navigation_helper.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/core/widgets/feature_scaffold.dart';
import 'package:pharmavie_mobile/features/explore/presentation/screens/pharmacy_detail_screen.dart';
import 'package:pharmavie_mobile/features/explore/presentation/widgets/pharmacy_city_filters.dart';

class PharmacyMapScreen extends StatefulWidget {
  const PharmacyMapScreen({super.key});

  @override
  State<PharmacyMapScreen> createState() => _PharmacyMapScreenState();
}

class _PharmacyMapScreenState extends State<PharmacyMapScreen> {
  final _api = ApiClient();
  final _mapController = MapController();
  UserLocation? _location;
  LatLng get _center => LatLng(_location?.latitude ?? defaultLat, _location?.longitude ?? defaultLng);

  List<dynamic> _pharmacies = [];
  bool _loading = true;
  String? _error;
  String _filter = 'all';
  String? _selectedCity;
  String? _selectedDistrict;
  Map<String, bool> _favorites = {};

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
      final loc = await LocationService.instance.getLocation();
      final query = buildPharmacyQuery(
        locationQueryParams: loc.queryParams,
        city: _selectedCity,
        district: _selectedDistrict,
        onDutyOnly: _filter == 'duty',
        radiusKm: 50,
      );
      final res = await _api.get('/pharmacies?$query', auth: false);
      final list = (res['data'] as List?) ?? [];
      final favMap = await _loadFavorites();
      setState(() {
        _location = loc;
        _pharmacies = list;
        _favorites = favMap;
        _loading = false;
      });
      _mapController.move(_center, 12);
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  List<dynamic> get _filtered {
    if (_filter == 'open') return _pharmacies.where((p) => (p['availableProducts'] as num? ?? 0) > 0).toList();
    return _pharmacies;
  }

  void _onCityFilterChanged(String? city, String? district) {
    setState(() {
      _selectedCity = city;
      _selectedDistrict = district;
    });
    _load();
  }

  void _setFilter(String filter) {
    setState(() => _filter = filter);
    _load();
  }

  Future<Map<String, bool>> _loadFavorites() async {
    final token = await _api.getToken();
    if (token != null) {
      try {
        final res = await _api.get('/users/me/favorites');
        final list = (res['data'] as List?) ?? [];
        return {for (final p in list) (p as Map<String, dynamic>)['id'] as String: true};
      } on ApiException {
        // fallback local
      }
    }
    final favIds = await LocalPrefsService.instance.getFavoritePharmacyIds();
    return {for (final id in favIds) id: true};
  }

  Future<void> _toggleFavorite(String id) async {
    final token = await _api.getToken();
    if (token != null) {
      try {
        if (_favorites.containsKey(id)) {
          await _api.delete('/users/me/favorites/$id');
        } else {
          await _api.post('/users/me/favorites/$id', {});
        }
      } on ApiException {
        await LocalPrefsService.instance.toggleFavoritePharmacy(id);
      }
    } else {
      await LocalPrefsService.instance.toggleFavoritePharmacy(id);
    }
    final favMap = await _loadFavorites();
    setState(() => _favorites = favMap);
  }

  void _focusPharmacy(Map<String, dynamic> pharmacy) {
    final lat = (pharmacy['latitude'] as num?)?.toDouble();
    final lng = (pharmacy['longitude'] as num?)?.toDouble();
    if (lat != null && lng != null) {
      _mapController.move(LatLng(lat, lng), 15);
    }
    _showPharmacySheet(pharmacy);
  }

  Future<void> _openDirections(Map<String, dynamic> pharmacy) async {
    final lat = (pharmacy['latitude'] as num?)?.toDouble();
    final lng = (pharmacy['longitude'] as num?)?.toDouble();
    if (lat == null || lng == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Coordonnées GPS indisponibles pour cette pharmacie')),
        );
      }
      return;
    }
    final ok = await NavigationHelper.openDirections(
      lat: lat,
      lng: lng,
      originLat: _location?.latitude,
      originLng: _location?.longitude,
    );
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Impossible d\'ouvrir l\'application de navigation')),
      );
    }
  }

  void _showPharmacySheet(Map<String, dynamic> pharmacy) {
    final id = pharmacy['id'] as String;
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2))),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(child: Text(pharmacy['name'] as String? ?? 'Pharmacie', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold))),
                IconButton(
                  onPressed: () {
                    _toggleFavorite(id);
                    Navigator.pop(ctx);
                    _showPharmacySheet(pharmacy);
                  },
                  icon: Icon(
                    _favorites.containsKey(id) ? Icons.favorite : Icons.favorite_border,
                    color: _favorites.containsKey(id) ? AppColors.red600 : AppColors.slate400,
                  ),
                ),
              ],
            ),
            Text(pharmacy['street'] as String? ?? '', style: const TextStyle(color: AppColors.slate500)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (pharmacy['isOnDuty'] == true)
                  _chip('De garde', AppColors.purple600, AppColors.purple50),
                _chip('${pharmacy['availableProducts'] ?? 0} produits', AppColors.brand700, AppColors.brand50),
                if (pharmacy['distanceKm'] != null)
                  _chip('${pharmacy['distanceKm']} km', AppColors.blue600, AppColors.blue50),
                _chip('★ ${pharmacy['rating'] ?? '—'}', AppColors.amber600, AppColors.amber50),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => PharmacyDetailScreen(
                        pharmacyId: id,
                        initialPharmacy: pharmacy,
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.shopping_bag_outlined),
                label: const Text('Commander dans cette pharmacie'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.brand600,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.pop(ctx);
                  _openDirections(pharmacy);
                },
                icon: const Icon(Icons.directions),
                label: const Text('Itinéraire vers la pharmacie'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.brand700,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _chip(String label, Color color, Color bg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return FeatureScaffold(
      title: 'Carte interactive',
      subtitle: _location == null
          ? 'Chargement de votre position…'
          : 'Pharmacies autour de vous · ${_location!.label}',
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_error!, style: const TextStyle(color: AppColors.red600)),
                      const SizedBox(height: 12),
                      ElevatedButton(onPressed: _load, child: const Text('Réessayer')),
                    ],
                  ),
                )
              : Column(
                  children: [
                    PharmacyCityFilters(
                      city: _selectedCity,
                      district: _selectedDistrict,
                      onChanged: _onCityFilterChanged,
                    ),
                    const SizedBox(height: 8),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
                      child: Row(
                        children: [
                          _FilterChip(label: 'Toutes', selected: _filter == 'all', onTap: () => _setFilter('all')),
                          const SizedBox(width: 8),
                          _FilterChip(label: 'De garde', selected: _filter == 'duty', onTap: () => _setFilter('duty')),
                          const SizedBox(width: 8),
                          _FilterChip(label: 'Avec stock', selected: _filter == 'open', onTap: () => _setFilter('open')),
                        ],
                      ),
                    ),
                    Expanded(
                      child: Stack(
                        children: [
                          FlutterMap(
                            mapController: _mapController,
                            options: MapOptions(initialCenter: _center, initialZoom: 12, minZoom: 10, maxZoom: 18),
                            children: [
                              TileLayer(
                                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                                userAgentPackageName: 'com.pharmavie.uborasoftware',
                              ),
                              MarkerLayer(
                                markers: [
                                  Marker(
                                    point: _center,
                                    width: 36,
                                    height: 36,
                                    child: Container(
                                      decoration: BoxDecoration(
                                        color: AppColors.blue600,
                                        shape: BoxShape.circle,
                                        border: Border.all(color: Colors.white, width: 2),
                                      ),
                                      child: const Icon(Icons.person_pin_circle, color: Colors.white, size: 20),
                                    ),
                                  ),
                                  ..._filtered.map((p) {
                                    final lat = (p['latitude'] as num?)?.toDouble() ?? _center.latitude;
                                    final lng = (p['longitude'] as num?)?.toDouble() ?? _center.longitude;
                                    final onDuty = p['isOnDuty'] == true;
                                    return Marker(
                                      point: LatLng(lat, lng),
                                      width: 40,
                                      height: 40,
                                      child: GestureDetector(
                                        onTap: () => _focusPharmacy(p as Map<String, dynamic>),
                                        child: Container(
                                          decoration: BoxDecoration(
                                            color: onDuty ? AppColors.purple600 : AppColors.brand600,
                                            shape: BoxShape.circle,
                                            border: Border.all(color: Colors.white, width: 2),
                                            boxShadow: [
                                              BoxShadow(color: Colors.black.withValues(alpha: 0.15), blurRadius: 6, offset: const Offset(0, 2)),
                                            ],
                                          ),
                                          child: const Icon(Icons.local_pharmacy, color: Colors.white, size: 18),
                                        ),
                                      ),
                                    );
                                  }),
                                ],
                              ),
                            ],
                          ),
                          Positioned(
                            bottom: 12,
                            left: 12,
                            right: 12,
                            child: Container(
                              constraints: const BoxConstraints(maxHeight: 140),
                              child: ListView.separated(
                                scrollDirection: Axis.horizontal,
                                itemCount: _filtered.length,
                                separatorBuilder: (_, __) => const SizedBox(width: 10),
                                itemBuilder: (_, i) {
                                  final p = _filtered[i] as Map<String, dynamic>;
                                  return GestureDetector(
                                    onTap: () => _focusPharmacy(p),
                                    child: Container(
                                      width: 200,
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(14),
                                        border: Border.all(color: AppColors.border),
                                        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 8)],
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(p['name'] as String? ?? '', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
                                          Text('${p['distanceKm'] ?? '—'} km', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
      selectedColor: AppColors.brand50,
      checkmarkColor: AppColors.brand700,
      labelStyle: TextStyle(color: selected ? AppColors.brand700 : AppColors.slate600, fontWeight: selected ? FontWeight.w600 : FontWeight.normal),
    );
  }
}
