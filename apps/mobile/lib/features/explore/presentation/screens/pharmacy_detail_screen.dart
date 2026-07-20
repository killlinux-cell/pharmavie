import 'dart:async';

import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/api/api_client.dart';
import 'package:pharmavie_mobile/core/services/cart_service.dart';
import 'package:pharmavie_mobile/core/services/location_service.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/core/utils/navigation_helper.dart';
import 'package:pharmavie_mobile/core/utils/order_status.dart';
import 'package:pharmavie_mobile/core/widgets/product_image.dart';
import 'package:pharmavie_mobile/core/widgets/app_widgets.dart';
import 'package:pharmavie_mobile/core/widgets/feature_scaffold.dart';
import 'package:pharmavie_mobile/features/auth/presentation/auth_screen.dart';
import 'package:pharmavie_mobile/features/cart/presentation/cart_screen.dart';

class PharmacyDetailScreen extends StatefulWidget {
  const PharmacyDetailScreen({
    super.key,
    required this.pharmacyId,
    this.initialPharmacy,
  });

  final String pharmacyId;
  final Map<String, dynamic>? initialPharmacy;

  @override
  State<PharmacyDetailScreen> createState() => _PharmacyDetailScreenState();
}

class _PharmacyDetailScreenState extends State<PharmacyDetailScreen> {
  final _api = ApiClient();
  final _searchController = TextEditingController();
  Timer? _debounce;

  Map<String, dynamic>? _pharmacy;
  List<dynamic> _products = [];
  bool _loadingPharmacy = true;
  bool _loadingProducts = true;
  bool _searching = false;
  String? _error;
  UserLocation? _location;

  @override
  void initState() {
    super.initState();
    _pharmacy = widget.initialPharmacy;
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loadingPharmacy = true;
      _loadingProducts = true;
      _error = null;
    });

    _location = await LocationService.instance.getLocation();

    try {
      final results = await Future.wait([
        _api.get('/pharmacies/${widget.pharmacyId}', auth: false),
        _api.get('/pharmacies/${widget.pharmacyId}/products', auth: false),
      ]);

      if (!mounted) return;
      setState(() {
        _pharmacy = results[0]['data'] as Map<String, dynamic>;
        _products = (results[1]['data'] as List?) ?? [];
        _loadingPharmacy = false;
        _loadingProducts = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loadingPharmacy = false;
        _loadingProducts = false;
      });
    }
  }

  Future<void> _searchProducts(String q) async {
    try {
      final path = q.trim().isEmpty
          ? '/pharmacies/${widget.pharmacyId}/products'
          : '/pharmacies/${widget.pharmacyId}/products?q=${Uri.encodeComponent(q.trim())}';
      final res = await _api.get(path, auth: false);
      if (!mounted) return;
      setState(() {
        _products = (res['data'] as List?) ?? [];
        _searching = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _searching = false;
      });
    }
  }

  void _onSearchChanged(String q) {
    _debounce?.cancel();
    setState(() => _searching = true);
    _debounce = Timer(const Duration(milliseconds: 350), () => _searchProducts(q));
  }

  Future<void> _addToCart(Map<String, dynamic> item) async {
    final token = await _api.getToken();
    if (token == null) {
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => AuthScreen(onAuthenticated: () => Navigator.pop(context)),
        ),
      );
      if (!await _api.getToken().then((t) => t != null)) return;
    }

    final cart = CartService.instance;
    final pharmacyId = item['pharmacyId'] as String;
    final pharmacyName = item['pharmacyName'] as String? ?? _pharmacy?['name'] as String? ?? 'Pharmacie';

    if (!cart.canAdd(pharmacyId)) {
      final replace = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Autre pharmacie'),
          content: Text(
            'Votre panier contient des articles de ${cart.pharmacyName}. Vider le panier pour commander chez $pharmacyName ?',
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
      pharmacyName: pharmacyName,
      price: item['price'] as int,
      requiresRx: item['requiresRx'] == true,
    ));

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Ajouté au panier'),
        behavior: SnackBarBehavior.floating,
        action: SnackBarAction(
          label: 'Voir le panier',
          onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CartScreen())),
        ),
      ),
    );
  }

  Future<void> _openDirections() async {
    final p = _pharmacy;
    if (p == null) return;
    final lat = (p['latitude'] as num?)?.toDouble();
    final lng = (p['longitude'] as num?)?.toDouble();
    if (lat == null || lng == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Coordonnées GPS indisponibles')),
      );
      return;
    }
    await NavigationHelper.openDirections(
      lat: lat,
      lng: lng,
      originLat: _location?.latitude,
      originLng: _location?.longitude,
    );
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = _pharmacy;
    final name = p?['name'] as String? ?? 'Pharmacie';

    return FeatureScaffold(
      title: name,
      subtitle: p != null ? '${p['street'] ?? ''} · ${p['city'] ?? ''}' : 'Chargement…',
      badge: 'Commander',
      actions: [
        if (p != null)
          IconButton(
            onPressed: _openDirections,
            icon: const Icon(Icons.directions_outlined),
            tooltip: 'Itinéraire',
          ),
      ],
      child: _loadingPharmacy && p == null
          ? const Center(child: CircularProgressIndicator())
          : Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (p != null) ...[
                  Container(
                    margin: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            if (p['isOnDuty'] == true)
                              const StatusBadge(
                                label: 'De garde',
                                color: AppColors.brand700,
                                bgColor: AppColors.brand50,
                              ),
                            StatusBadge(
                              label: '${_products.length} produit(s)',
                              color: AppColors.blue600,
                              bgColor: AppColors.blue50,
                              icon: Icons.inventory_2_outlined,
                            ),
                            if (p['distanceKm'] != null)
                              StatusBadge(
                                label: '${p['distanceKm']} km',
                                color: AppColors.slate600,
                                bgColor: AppColors.surfaceMuted,
                                icon: Icons.place,
                              ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'Parcourez le catalogue de cette pharmacie et ajoutez vos médicaments au panier.',
                          style: TextStyle(fontSize: 13, color: AppColors.slate600),
                        ),
                      ],
                    ),
                  ),
                ],
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: TextField(
                    controller: _searchController,
                    onChanged: _onSearchChanged,
                    decoration: InputDecoration(
                      hintText: 'Rechercher dans cette pharmacie…',
                      prefixIcon: const Icon(Icons.search_rounded, color: AppColors.brand600),
                      suffixIcon: _searching
                          ? const Padding(
                              padding: EdgeInsets.all(12),
                              child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                            )
                          : null,
                    ),
                  ),
                ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Text(_error!, style: const TextStyle(color: AppColors.red600)),
                  ),
                Expanded(
                  child: _loadingProducts
                      ? const Center(child: CircularProgressIndicator())
                      : _products.isEmpty
                          ? const Center(
                              child: Padding(
                                padding: EdgeInsets.all(32),
                                child: Text(
                                  'Aucun produit disponible dans cette pharmacie pour le moment.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(color: AppColors.slate500),
                                ),
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                              itemCount: _products.length,
                              itemBuilder: (context, i) {
                                final item = _products[i] as Map<String, dynamic>;
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 10),
                                  child: _ProductTile(item: item, onAdd: () => _addToCart(item)),
                                );
                              },
                            ),
                ),
              ],
            ),
    );
  }
}

class _ProductTile extends StatelessWidget {
  const _ProductTile({required this.item, required this.onAdd});

  final Map<String, dynamic> item;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final requiresRx = item['requiresRx'] == true;
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onAdd,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              ProductImage(imageUrl: item['imageUrl'] as String?, size: 44, borderRadius: 12),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item['name'] as String, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    if (item['dci'] != null && (item['dci'] as String).isNotEmpty)
                      Text(item['dci'] as String, style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(
                          formatFcfa(item['price'] as int),
                          style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.brand700, fontSize: 13),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Stock: ${item['quantity']}',
                          style: const TextStyle(fontSize: 11, color: AppColors.slate500),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Column(
                children: [
                  if (requiresRx)
                    const StatusBadge(
                      label: 'Rx',
                      color: AppColors.amber600,
                      bgColor: AppColors.amber50,
                    ),
                  const SizedBox(height: 6),
                  IconButton(
                    onPressed: onAdd,
                    icon: const Icon(Icons.add_shopping_cart, color: AppColors.brand600),
                    tooltip: 'Ajouter au panier',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
