import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/services/cart_service.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/core/utils/order_status.dart';
import 'package:pharmavie_mobile/features/checkout/presentation/checkout_screen.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final _cart = CartService.instance;

  @override
  void initState() {
    super.initState();
    _cart.addListener(_onCartChanged);
  }

  @override
  void dispose() {
    _cart.removeListener(_onCartChanged);
    super.dispose();
  }

  void _onCartChanged() => setState(() {});

  void _checkout() {
    if (_cart.isEmpty) return;
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => CheckoutScreen(items: List.of(_cart.items))),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mon panier'),
        actions: [
          if (!_cart.isEmpty)
            TextButton(
              onPressed: () {
                _cart.clear();
              },
              child: const Text('Vider'),
            ),
        ],
      ),
      body: _cart.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.shopping_cart_outlined, size: 64, color: AppColors.slate400),
                  const SizedBox(height: 16),
                  const Text('Votre panier est vide', style: TextStyle(color: AppColors.slate500, fontSize: 16)),
                  const SizedBox(height: 8),
                  const Text('Recherchez un médicament sur l\'accueil', style: TextStyle(color: AppColors.slate400, fontSize: 13)),
                ],
              ),
            )
          : Column(
              children: [
                if (_cart.pharmacyName != null)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    color: AppColors.brand50,
                    child: Row(
                      children: [
                        const Icon(Icons.local_pharmacy, color: AppColors.brand600, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _cart.pharmacyName!,
                            style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.brand700),
                          ),
                        ),
                      ],
                    ),
                  ),
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _cart.items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (_, i) {
                      final item = _cart.items[i];
                      return Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(item.productName, style: const TextStyle(fontWeight: FontWeight.w600)),
                                  const SizedBox(height: 4),
                                  Text(formatFcfa(item.price), style: const TextStyle(color: AppColors.brand700, fontWeight: FontWeight.bold)),
                                  if (item.requiresRx)
                                    const Padding(
                                      padding: EdgeInsets.only(top: 4),
                                      child: Text('Ordonnance requise', style: TextStyle(fontSize: 11, color: AppColors.amber600)),
                                    ),
                                ],
                              ),
                            ),
                            Row(
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.remove_circle_outline),
                                  onPressed: () => _cart.updateQuantity(item.productId, item.quantity - 1),
                                ),
                                Text('${item.quantity}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                IconButton(
                                  icon: const Icon(Icons.add_circle_outline),
                                  onPressed: () => _cart.updateQuantity(item.productId, item.quantity + 1),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border(top: BorderSide(color: AppColors.border)),
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -4))],
                  ),
                  child: SafeArea(
                    top: false,
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('${_cart.count} article(s)', style: const TextStyle(color: AppColors.slate500)),
                            Text(formatFcfa(_cart.subtotal), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.brand700)),
                          ],
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _checkout,
                            style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                            child: const Text('Commander'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
