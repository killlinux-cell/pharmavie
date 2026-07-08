import 'dart:async';
import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/api/api_client.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/core/utils/order_status.dart';
import 'package:pharmavie_mobile/core/widgets/app_widgets.dart';
import 'package:pharmavie_mobile/features/auth/presentation/auth_screen.dart';
import 'package:pharmavie_mobile/core/services/cart_service.dart';
import 'package:pharmavie_mobile/core/services/location_service.dart';
import 'package:pharmavie_mobile/core/utils/navigation_helper.dart';
import 'package:pharmavie_mobile/features/cart/presentation/cart_screen.dart';
import 'package:pharmavie_mobile/features/explore/presentation/screens/pharmacy_map_screen.dart';
import 'package:pharmavie_mobile/features/explore/presentation/widgets/pharmacy_city_filters.dart';
import 'package:pharmavie_mobile/features/explore/presentation/screens/barcode_scan_screen.dart';

class HomeTab extends StatefulWidget {
  const HomeTab({super.key, required this.authenticated, required this.onAuthChanged});

  final bool authenticated;
  final VoidCallback onAuthChanged;

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  final _api = ApiClient();
  final _searchController = TextEditingController();
  Timer? _debounce;
  List<dynamic> _pharmacies = [];
  List<dynamic> _searchResults = [];
  bool _searching = false;
  bool _loadingPharmacies = true;
  String? _error;
  UserLocation? _location;
  String _pharmacyFilter = 'all'; // all | duty
  String? _selectedCity;
  String? _selectedDistrict;

  @override
  void initState() {
    super.initState();
    _initLocation();
  }

  Future<void> _initLocation() async {
    final loc = await LocationService.instance.getLocation();
    if (mounted) {
      setState(() => _location = loc);
      await _loadPharmacies();
    }
  }

  List<dynamic> get _displayPharmacies => _pharmacies;

  Future<void> _loadPharmacies() async {
    final loc = _location ?? await LocationService.instance.getLocation();
    setState(() {
      _loadingPharmacies = true;
      _location = loc;
    });
    try {
      final query = buildPharmacyQuery(
        locationQueryParams: loc.queryParams,
        city: _selectedCity,
        district: _selectedDistrict,
        onDutyOnly: _pharmacyFilter == 'duty',
        radiusKm: 30,
      );
      final res = await _api.get('/pharmacies?$query', auth: false);
      setState(() {
        _pharmacies = (res['data'] as List?) ?? [];
        _error = null;
        _loadingPharmacies = false;
      });
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
        _loadingPharmacies = false;
      });
    }
  }

  Future<void> _refreshAll() async {
    final loc = await LocationService.instance.refresh();
    setState(() => _location = loc);
    await _loadPharmacies();
  }

  void _onCityFilterChanged(String? city, String? district) {
    setState(() {
      _selectedCity = city;
      _selectedDistrict = district;
    });
    _loadPharmacies();
  }

  Future<void> _search(String q) async {
    final loc = _location ?? await LocationService.instance.getLocation();
    try {
      final res = await _api.get(
        '/products/search?q=${Uri.encodeComponent(q)}&${loc.queryParams}',
        auth: false,
      );
      setState(() {
        _searchResults = (res['data'] as List?) ?? [];
        _searching = false;
      });
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
        _searching = false;
      });
    }
  }

  void _onSearchChanged(String q) {
    _debounce?.cancel();
    if (q.trim().isEmpty) {
      setState(() {
        _searchResults = [];
        _searching = false;
      });
      return;
    }
    setState(() => _searching = true);
    _debounce = Timer(const Duration(milliseconds: 400), () => _search(q));
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _addToCart(Map<String, dynamic> item) async {
    if (!widget.authenticated) {
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => AuthScreen(onAuthenticated: () {
            Navigator.pop(context);
            widget.onAuthChanged();
          }),
        ),
      );
      if (!await _api.getToken().then((t) => t != null)) return;
    }

    final cart = CartService.instance;
    final pharmacyId = item['pharmacyId'] as String;
    if (!cart.canAdd(pharmacyId)) {
      final replace = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Autre pharmacie'),
          content: Text(
            'Votre panier contient des articles de ${cart.pharmacyName}. Vider le panier pour ajouter depuis ${item['pharmacyName']} ?',
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
            TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Vider et ajouter')),
          ],
        ),
      );
      if (replace != true) return;
      cart.clear();
    }

    cart.add(CartItem(
      productId: item['productId'] as String,
      productName: item['name'] as String,
      pharmacyId: pharmacyId,
      pharmacyName: item['pharmacyName'] as String,
      price: item['price'] as int,
      requiresRx: item['requiresRx'] == true,
    ));

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Ajouté au panier'),
        behavior: SnackBarBehavior.floating,
        action: SnackBarAction(
          label: 'Voir',
          onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CartScreen())),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final showResults = _searchResults.isNotEmpty || _searching;

    return SafeArea(
      bottom: false,
      child: RefreshIndicator(
      onRefresh: _refreshAll,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppColors.brand50, AppColors.surfaceMuted],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const PharmaLogo(),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('PharmaVie', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                            Text(
                              _location == null
                                  ? 'Localisation…'
                                  : '${_location!.label}${_location!.fromGps ? ' · GPS' : ''}',
                              style: const TextStyle(color: AppColors.slate500, fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                      if (!widget.authenticated)
                        TextButton(
                          onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => AuthScreen(onAuthenticated: () {
                                Navigator.pop(context);
                                widget.onAuthChanged();
                              }),
                            ),
                          ),
                          child: const Text('Connexion'),
                        ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Trouvez vos\nmédicaments',
                    style: TextStyle(fontSize: 30, fontWeight: FontWeight.bold, height: 1.15, color: AppColors.slate900),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Prix, disponibilité et pharmacies proches',
                    style: TextStyle(color: AppColors.slate600, fontSize: 15),
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    controller: _searchController,
                    onChanged: _onSearchChanged,
                    decoration: InputDecoration(
                      hintText: 'Paracétamol, Ibuprofène, DCI...',
                      prefixIcon: const Icon(Icons.search_rounded, color: AppColors.brand600),
                      suffixIcon: _searching
                          ? const Padding(
                              padding: EdgeInsets.all(12),
                              child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                            )
                          : IconButton(
                              icon: const Icon(Icons.qr_code_scanner_rounded, color: AppColors.slate400),
                              onPressed: () => Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => const BarcodeScanScreen()),
                              ),
                            ),
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.red50,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: AppColors.red600, size: 18),
                          const SizedBox(width: 8),
                          Expanded(child: Text(_error!, style: const TextStyle(color: AppColors.red600, fontSize: 13))),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          if (!showResults) ...[
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    _QuickChip(
                      icon: Icons.map_outlined,
                      label: 'Carte',
                      selected: false,
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PharmacyMapScreen())),
                    ),
                    const SizedBox(width: 10),
                    _QuickChip(
                      icon: Icons.nightlight_round,
                      label: 'De garde',
                      selected: _pharmacyFilter == 'duty',
                      onTap: () {
                        setState(() => _pharmacyFilter = _pharmacyFilter == 'duty' ? 'all' : 'duty');
                        _loadPharmacies();
                      },
                    ),
                    const SizedBox(width: 10),
                    _QuickChip(
                      icon: Icons.my_location,
                      label: 'Ma position',
                      selected: false,
                      onTap: _refreshAll,
                    ),
                  ],
                ),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 8)),
            SliverToBoxAdapter(
              child: PharmacyCityFilters(
                city: _selectedCity,
                district: _selectedDistrict,
                onChanged: _onCityFilterChanged,
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 8)),
            const SliverToBoxAdapter(child: SectionHeader(title: 'Pharmacies proches', subtitle: 'Triées par distance depuis vous')),
          ],
          if (_loadingPharmacies && !showResults)
            const SliverToBoxAdapter(
              child: Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator())),
            ),
          if (showResults)
            SliverToBoxAdapter(
              child: SectionHeader(
                title: 'Résultats',
                subtitle: '${_searchResults.length} produit(s) trouvé(s)',
              ),
            ),
          if (showResults && !_searching && _searchResults.isEmpty)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: Text('Aucun produit trouvé', style: TextStyle(color: AppColors.slate500))),
              ),
            ),
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, i) {
                if (showResults) {
                  final item = _searchResults[i] as Map<String, dynamic>;
                  final inStock = item['inStock'] == true;
                  return Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                    child: _ProductCard(item: item, inStock: inStock, onTap: inStock ? () => _addToCart(item) : null),
                  );
                }
                final p = _displayPharmacies[i] as Map<String, dynamic>;
                return Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                  child: _PharmacyCard(pharmacy: p, userLocation: _location),
                );
              },
              childCount: showResults ? _searchResults.length : _displayPharmacies.length,
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ),
    ),
    );
  }
}

class _QuickChip extends StatelessWidget {
  const _QuickChip({required this.icon, required this.label, required this.onTap, this.selected = false});

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: selected ? AppColors.brand600 : AppColors.border),
              color: selected ? AppColors.brand50 : Colors.white,
            ),
            child: Column(
              children: [
                Icon(icon, color: AppColors.brand600, size: 22),
                const SizedBox(height: 6),
                Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.item, required this.inStock, this.onTap});

  final Map<String, dynamic> item;
  final bool inStock;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: AppColors.brand50,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(Icons.medication_liquid, color: AppColors.brand600),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item['name'] as String, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                    const SizedBox(height: 4),
                    Text(
                      item['pharmacyName'] as String,
                      style: const TextStyle(fontSize: 13, color: AppColors.slate500),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Text(
                          formatFcfa(item['price'] as int),
                          style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.brand700),
                        ),
                        const SizedBox(width: 8),
                        Icon(Icons.place, size: 12, color: AppColors.slate400),
                        Text(' ${item['distanceKm'] ?? '?'} km', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                      ],
                    ),
                  ],
                ),
              ),
              Column(
                children: [
                  StatusBadge(
                    label: inStock ? 'Dispo' : 'Rupture',
                    color: inStock ? AppColors.brand700 : AppColors.red600,
                    bgColor: inStock ? AppColors.brand50 : AppColors.red50,
                    icon: inStock ? Icons.check : Icons.close,
                  ),
                  if (inStock) ...[
                    const SizedBox(height: 8),
                    const Icon(Icons.add_shopping_cart, size: 18, color: AppColors.brand600),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PharmacyCard extends StatelessWidget {
  const _PharmacyCard({required this.pharmacy, this.userLocation});

  final Map<String, dynamic> pharmacy;
  final UserLocation? userLocation;

  Future<void> _openDirections(BuildContext context) async {
    final lat = (pharmacy['latitude'] as num?)?.toDouble();
    final lng = (pharmacy['longitude'] as num?)?.toDouble();
    if (lat == null || lng == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Coordonnées GPS indisponibles')),
      );
      return;
    }
    final ok = await NavigationHelper.openDirections(
      lat: lat,
      lng: lng,
      originLat: userLocation?.latitude,
      originLng: userLocation?.longitude,
    );
    if (!ok && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Impossible d\'ouvrir la navigation')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final onDuty = pharmacy['isOnDuty'] == true;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _openDirections(context),
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        child: Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: AppColors.brand50,
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.local_pharmacy_rounded, color: AppColors.brand600, size: 28),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(pharmacy['name'] as String, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.place, size: 13, color: AppColors.slate400),
                    Text(' ${pharmacy['distanceKm'] ?? '?'} km', style: const TextStyle(fontSize: 13, color: AppColors.slate500)),
                    const SizedBox(width: 8),
                    const Icon(Icons.star_rounded, size: 13, color: AppColors.amber600),
                    Text(' ${pharmacy['rating'] ?? 0}', style: const TextStyle(fontSize: 13, color: AppColors.slate600)),
                  ],
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => _openDirections(context),
            icon: const Icon(Icons.directions, color: AppColors.brand600),
            tooltip: 'Itinéraire',
          ),
          StatusBadge(
            label: onDuty ? 'De garde' : 'Ouverte',
            color: onDuty ? AppColors.brand700 : AppColors.slate600,
            bgColor: onDuty ? AppColors.brand50 : AppColors.surfaceMuted,
          ),
        ],
      ),
        ),
      ),
    );
  }
}
