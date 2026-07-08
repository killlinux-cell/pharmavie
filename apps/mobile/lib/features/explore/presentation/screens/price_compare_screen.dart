import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/api/api_client.dart';
import 'package:pharmavie_mobile/core/services/location_service.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/core/utils/order_status.dart';
import 'package:pharmavie_mobile/core/widgets/feature_scaffold.dart';
import 'package:pharmavie_mobile/features/explore/presentation/widgets/pharmacy_city_filters.dart';

class PriceCompareScreen extends StatefulWidget {
  const PriceCompareScreen({super.key});

  @override
  State<PriceCompareScreen> createState() => _PriceCompareScreenState();
}

class _PriceCompareScreenState extends State<PriceCompareScreen> {
  final _api = ApiClient();
  final _searchController = TextEditingController();
  List<dynamic> _results = [];
  bool _loading = false;
  String? _error;
  String? _selectedCity;
  String? _selectedDistrict;
  UserLocation? _location;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    _location = await LocationService.instance.getLocation();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final q = _searchController.text.trim();
    if (q.length < 2) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final loc = _location ?? await LocationService.instance.getLocation();
      final parts = <String>[
        'q=${Uri.encodeComponent(q)}',
        loc.queryParams,
      ];
      if (_selectedCity != null) parts.add('city=${Uri.encodeComponent(_selectedCity!)}');
      if (_selectedDistrict != null) parts.add('district=${Uri.encodeComponent(_selectedDistrict!)}');

      final res = await _api.get('/products/compare?${parts.join('&')}', auth: false);
      if (!mounted) return;
      setState(() {
        _results = (res['data'] as List?) ?? [];
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Future<void> _reportPrice(Map<String, dynamic> offer, Map<String, dynamic> group) async {
    final token = await _api.getToken();
    if (token == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Connectez-vous pour signaler un prix')),
        );
      }
      return;
    }

    final noteCtrl = TextEditingController();
    final priceCtrl = TextEditingController(text: '${offer['price']}');

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Signaler un prix'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${group['name']} — ${offer['pharmacyName']}', style: const TextStyle(fontSize: 13)),
            const SizedBox(height: 12),
            TextField(
              controller: priceCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Prix constaté (FCFA)'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: noteCtrl,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Commentaire (optionnel)'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Envoyer')),
        ],
      ),
    );

    if (ok != true) return;

    try {
      await _api.post('/products/price-reports', {
        'pharmacyId': offer['pharmacyId'],
        'productId': group['productId'],
        'reportedPrice': int.tryParse(priceCtrl.text.replaceAll(RegExp(r'\D'), '')) ?? offer['price'],
        if (noteCtrl.text.trim().isNotEmpty) 'note': noteCtrl.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Signalement enregistré. Merci !')),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return FeatureScaffold(
      title: 'Comparateur de prix',
      subtitle: 'Comparez le même médicament entre pharmacies',
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Nom du médicament (ex: Efferalgan, Ospamox…)',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.compare_arrows),
                  onPressed: _loading ? null : _search,
                ),
              ),
              onSubmitted: (_) => _search(),
            ),
          ),
          const SizedBox(height: 10),
          PharmacyCityFilters(
            city: _selectedCity,
            district: _selectedDistrict,
            onChanged: (city, district) {
              setState(() {
                _selectedCity = city;
                _selectedDistrict = district;
              });
              if (_searchController.text.trim().length >= 2) _search();
            },
          ),
          const SizedBox(height: 8),
          if (_loading) const Expanded(child: Center(child: CircularProgressIndicator()))
          else if (_error != null)
            Expanded(
              child: Center(child: Text(_error!, style: const TextStyle(color: AppColors.red600))),
            )
          else if (_results.isEmpty)
            const Expanded(
              child: Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Text(
                    'Recherchez un médicament pour voir les prix par pharmacie.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.slate500),
                  ),
                ),
              ),
            )
          else
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                itemCount: _results.length,
                separatorBuilder: (_, __) => const SizedBox(height: 16),
                itemBuilder: (_, i) => _CompareGroupCard(
                  group: _results[i] as Map<String, dynamic>,
                  onReport: (offer) => _reportPrice(offer, _results[i] as Map<String, dynamic>),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _CompareGroupCard extends StatelessWidget {
  const _CompareGroupCard({required this.group, required this.onReport});

  final Map<String, dynamic> group;
  final void Function(Map<String, dynamic> offer) onReport;

  @override
  Widget build(BuildContext context) {
    final offers = (group['offers'] as List?) ?? [];
    final spread = group['spreadPct'] as int? ?? 0;
    final minPrice = group['minPrice'] as int? ?? 0;
    final maxPrice = group['maxPrice'] as int? ?? 0;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(group['name'] as String? ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                if (group['dci'] != null)
                  Text(group['dci'] as String, style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    if (spread > 0)
                      _badge('Écart $spread %', AppColors.amber600, AppColors.amber50),
                    _badge('${formatFcfa(minPrice)} – ${formatFcfa(maxPrice)}', AppColors.brand700, AppColors.brand50),
                    _badge('${offers.length} pharmacies', AppColors.blue600, AppColors.blue50),
                  ],
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          ...offers.take(8).map((raw) {
            final o = raw as Map<String, dynamic>;
            final inStock = o['inStock'] == true;
            final isCheapest = inStock && (o['price'] as int? ?? 0) == minPrice && minPrice > 0;
            return ListTile(
              dense: true,
              title: Text(o['pharmacyName'] as String? ?? '', style: const TextStyle(fontSize: 14)),
              subtitle: Text(
                '${o['distanceKm'] ?? '—'} km · ${inStock ? 'Dispo' : 'Rupture'}',
                style: TextStyle(fontSize: 12, color: inStock ? AppColors.slate500 : AppColors.red600),
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        formatFcfa(o['price'] as int? ?? 0),
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: isCheapest ? AppColors.brand700 : AppColors.slate600,
                        ),
                      ),
                      if (isCheapest)
                        const Text('Moins cher', style: TextStyle(fontSize: 10, color: AppColors.brand600)),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.flag_outlined, size: 18, color: AppColors.slate400),
                    tooltip: 'Signaler',
                    onPressed: () => onReport(o),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _badge(String label, Color color, Color bg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color)),
    );
  }
}
