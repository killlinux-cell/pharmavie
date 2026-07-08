import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:pharmavie_mobile/core/api/api_client.dart';
import 'package:pharmavie_mobile/core/services/camera_permission_service.dart';
import 'package:pharmavie_mobile/core/services/local_prefs_service.dart';
import 'package:pharmavie_mobile/core/services/location_service.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/core/utils/order_status.dart';
import 'package:pharmavie_mobile/core/services/cart_service.dart';
import 'package:pharmavie_mobile/features/auth/presentation/auth_screen.dart';
import 'package:pharmavie_mobile/core/widgets/feature_scaffold.dart';

class BarcodeScanScreen extends StatefulWidget {
  const BarcodeScanScreen({super.key});

  @override
  State<BarcodeScanScreen> createState() => _BarcodeScanScreenState();
}

class _BarcodeScanScreenState extends State<BarcodeScanScreen> {
  final _api = ApiClient();
  final _manualController = TextEditingController();
  MobileScannerController? _scanner;
  List<dynamic> _results = [];
  bool _searching = false;
  bool _checkingPermission = true;
  bool _hasPermission = false;
  String? _lastScanned;
  String? _error;
  String? _hint;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _initCamera());
  }

  Future<void> _initCamera() async {
    final granted = await CameraPermissionService.ensureCamera(context);
    if (!mounted) return;
    setState(() {
      _hasPermission = granted;
      _checkingPermission = false;
    });
    if (granted) {
      _scanner = MobileScannerController(detectionSpeed: DetectionSpeed.noDuplicates);
      setState(() {});
    }
  }

  @override
  void dispose() {
    _scanner?.dispose();
    _manualController.dispose();
    super.dispose();
  }

  Future<void> _search(String code) async {
    if (code.trim().isEmpty) return;
    setState(() {
      _searching = true;
      _error = null;
      _hint = null;
      _lastScanned = code;
    });
    await LocalPrefsService.instance.addSearchHistory(code);
    try {
      final loc = await LocationService.instance.getLocation();
      final res = await _api.get(
        '/products/search?q=${Uri.encodeComponent(code)}&${loc.queryParams}',
        auth: false,
      );
      setState(() {
        _results = (res['data'] as List?) ?? [];
        _searching = false;
        _hint = (res['meta'] as Map<String, dynamic>?)?['hint'] as String?;
      });
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
        _searching = false;
      });
    }
  }

  void _onDetect(BarcodeCapture capture) {
    final code = capture.barcodes.firstOrNull?.rawValue;
    if (code != null && code != _lastScanned) {
      _search(code);
    }
  }

  Widget _buildCameraPreview() {
    if (_checkingPermission) {
      return const Center(child: CircularProgressIndicator(color: Colors.white));
    }

    if (!_hasPermission) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.camera_alt_outlined, size: 48, color: Colors.white70),
              const SizedBox(height: 12),
              const Text(
                'Autorisez la caméra pour scanner un code-barres',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () {
                  setState(() => _checkingPermission = true);
                  _initCamera();
                },
                child: const Text('Autoriser la caméra'),
              ),
            ],
          ),
        ),
      );
    }

    if (_scanner == null) {
      return const Center(child: CircularProgressIndicator(color: Colors.white));
    }

    return MobileScanner(
      controller: _scanner,
      onDetect: _onDetect,
      errorBuilder: (context, error, child) => Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            'Caméra indisponible : ${error.errorCode.name}',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.white),
          ),
        ),
      ),
    );
  }

  Future<void> _addToCart(Map<String, dynamic> item) async {
    final token = await _api.getToken();
    if (token == null) {
      if (!mounted) return;
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => AuthScreen(onAuthenticated: () => Navigator.pop(context)),
        ),
      );
      if (await _api.getToken() == null) return;
    }
    final inStock = item['inStock'] == true;
    if (!inStock) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Produit en rupture de stock')),
        );
      }
      return;
    }
    final cart = CartService.instance;
    final pharmacyId = item['pharmacyId'] as String;
    if (!cart.canAdd(pharmacyId)) cart.clear();
    cart.add(CartItem(
      productId: item['productId'] as String,
      productName: item['name'] as String,
      pharmacyId: pharmacyId,
      pharmacyName: item['pharmacyName'] as String,
      price: item['price'] as int,
      requiresRx: item['requiresRx'] == true,
    ));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ajouté au panier')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return FeatureScaffold(
      title: 'Scan code-barres',
      subtitle: 'Trouvez un médicament par scan ou saisie manuelle',
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
            child: SizedBox(
              height: 220,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  ColoredBox(color: Colors.black87, child: _buildCameraPreview()),
                  if (_hasPermission && !_checkingPermission)
                    Center(
                      child: Container(
                        width: 220,
                        height: 120,
                        decoration: BoxDecoration(
                          border: Border.all(color: AppColors.brand500, width: 2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  if (_hasPermission && !_checkingPermission)
                    Positioned(
                      bottom: 12,
                      left: 0,
                      right: 0,
                      child: Text(
                        'Placez le code-barres dans le cadre',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.9),
                          fontWeight: FontWeight.w500,
                          shadows: const [Shadow(blurRadius: 4)],
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _manualController,
                  decoration: const InputDecoration(
                    labelText: 'Code-barres manuel',
                    hintText: 'Ex: 6190000010011',
                    prefixIcon: Icon(Icons.numbers),
                  ),
                  keyboardType: TextInputType.number,
                ),
              ),
              const SizedBox(width: 10),
              ElevatedButton(
                onPressed: _searching ? null : () => _search(_manualController.text),
                child: const Icon(Icons.search),
              ),
            ],
          ),
          if (_lastScanned != null) ...[
            const SizedBox(height: 8),
            Text('Dernier scan : $_lastScanned', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
          ],
          if (_searching) ...[
            const SizedBox(height: 24),
            const Center(child: CircularProgressIndicator()),
          ],
          if (_error != null) ...[
            const SizedBox(height: 16),
            Text(_error!, style: const TextStyle(color: AppColors.red600)),
          ],
          if (!_searching && _results.isEmpty && _lastScanned != null) ...[
            const SizedBox(height: 24),
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Text(
                  _hint ??
                      'Code scanné : $_lastScanned\n\nCe code-barres n\'est pas encore dans notre catalogue. Recherchez le médicament par son nom sur l\'accueil (ex: Efferalgan, Voltarene).',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.slate500, fontSize: 13, height: 1.4),
                ),
              ),
            ),
          ],
          if (_results.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text('${_results.length} résultat(s)', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 12),
            ..._results.map((item) {
              final map = item as Map<String, dynamic>;
              final inStock = map['inStock'] == true;
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: inStock ? AppColors.border : AppColors.red50),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text(map['name'] as String? ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15))),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: inStock ? AppColors.brand50 : AppColors.red50,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(inStock ? 'Dispo' : 'Rupture', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: inStock ? AppColors.brand700 : AppColors.red600)),
                        ),
                      ],
                    ),
                    if (map['dci'] != null) Text(map['dci'] as String, style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.local_pharmacy, size: 16, color: AppColors.brand600),
                        const SizedBox(width: 6),
                        Expanded(child: Text(map['pharmacyName'] as String? ?? '', style: const TextStyle(fontSize: 13))),
                        Text(formatFcfa((map['price'] as num?)?.toInt() ?? 0), style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.brand700)),
                      ],
                    ),
                    if (inStock) ...[
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: () => _addToCart(map),
                          icon: const Icon(Icons.add_shopping_cart, size: 18),
                          label: const Text('Ajouter au panier'),
                        ),
                      ),
                    ],
                  ],
                ),
              );
            }),
          ],
        ],
      ),
    );
  }
}
