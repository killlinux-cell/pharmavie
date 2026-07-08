import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/api/api_client.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/core/utils/order_status.dart';
import 'package:pharmavie_mobile/core/widgets/app_widgets.dart';
import 'package:pharmavie_mobile/features/auth/presentation/auth_screen.dart';

class OrdersTab extends StatefulWidget {
  const OrdersTab({super.key, required this.authenticated, required this.onNeedAuth});

  final bool authenticated;
  final VoidCallback onNeedAuth;

  @override
  State<OrdersTab> createState() => _OrdersTabState();
}

class _OrdersTabState extends State<OrdersTab> {
  final _api = ApiClient();
  List<dynamic> _orders = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.authenticated) {
      _load();
    } else {
      setState(() => _loading = false);
    }
  }

  @override
  void didUpdateWidget(covariant OrdersTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.authenticated && !oldWidget.authenticated) _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await _api.get('/orders');
      setState(() => _orders = (res['data'] as List?) ?? []);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      setState(() => _loading = false);
    }
  }

  void _showDetail(Map<String, dynamic> order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _OrderDetailSheet(order: order),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.authenticated) {
      return _LoginPrompt(
        onLogin: () async {
          await Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => AuthScreen(onAuthenticated: () => Navigator.pop(context))),
          );
          widget.onNeedAuth();
        },
      );
    }

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 12, 0),
              child: Row(
                children: [
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Mes commandes', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                        Text('Suivez vos achats en temps réel', style: TextStyle(color: AppColors.slate500, fontSize: 13)),
                      ],
                    ),
                  ),
                  IconButton(onPressed: _load, icon: const Icon(Icons.refresh_rounded)),
                ],
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.brand600))
                  : _error != null
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.cloud_off, size: 48, color: AppColors.slate400),
                                const SizedBox(height: 12),
                                Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.red600)),
                                TextButton(onPressed: _load, child: const Text('Réessayer')),
                              ],
                            ),
                          ),
                        )
                      : _orders.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.shopping_bag_outlined, size: 64, color: AppColors.slate400.withValues(alpha: 0.5)),
                                  const SizedBox(height: 16),
                                  const Text('Aucune commande', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                                  const SizedBox(height: 4),
                                  const Text('Vos commandes apparaîtront ici', style: TextStyle(color: AppColors.slate500)),
                                ],
                              ),
                            )
                          : RefreshIndicator(
                              onRefresh: _load,
                              child: ListView.builder(
                                padding: const EdgeInsets.all(20),
                                itemCount: _orders.length,
                                itemBuilder: (context, i) {
                                  final o = _orders[i] as Map<String, dynamic>;
                                  return _OrderCard(order: o, onTap: () => _showDetail(o));
                                },
                              ),
                            ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order, required this.onTap});

  final Map<String, dynamic> order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final status = order['status'] as String? ?? 'NEW';
    final info = OrderStatusUtil.get(status);
    final pharmacy = order['pharmacy'] as Map<String, dynamic>?;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        order['orderNumber'] as String,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                    ),
                    StatusBadge(label: info.label, color: info.color, bgColor: info.bgColor, icon: info.icon),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Icon(Icons.local_pharmacy_outlined, size: 16, color: AppColors.slate400),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        pharmacy?['name'] ?? 'Pharmacie',
                        style: const TextStyle(color: AppColors.slate600, fontSize: 13),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      formatFcfa(order['total'] as int),
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.brand700),
                    ),
                    Text(
                      formatDate(order['createdAt'] as String),
                      style: const TextStyle(fontSize: 11, color: AppColors.slate400),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(
                      order['type'] == 'DELIVERY' ? Icons.delivery_dining : Icons.store,
                      size: 14,
                      color: AppColors.slate500,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      order['type'] == 'DELIVERY' ? 'Livraison' : 'Retrait en pharmacie',
                      style: const TextStyle(fontSize: 12, color: AppColors.slate500),
                    ),
                    const Spacer(),
                    const Text('Détails', style: TextStyle(fontSize: 12, color: AppColors.brand600, fontWeight: FontWeight.w600)),
                    const Icon(Icons.chevron_right, size: 16, color: AppColors.brand600),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _OrderDetailSheet extends StatelessWidget {
  const _OrderDetailSheet({required this.order});

  final Map<String, dynamic> order;

  @override
  Widget build(BuildContext context) {
    final status = order['status'] as String? ?? 'NEW';
    final items = (order['items'] as List?) ?? [];
    final pharmacy = order['pharmacy'] as Map<String, dynamic>?;

    return Container(
      margin: const EdgeInsets.only(top: 60),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: DraggableScrollableSheet(
        initialChildSize: 0.85,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (_, controller) => ListView(
          controller: controller,
          padding: const EdgeInsets.all(24),
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 20),
            Text(order['orderNumber'] as String, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(pharmacy?['name'] ?? '', style: const TextStyle(color: AppColors.slate500)),
            const SizedBox(height: 20),
            const Text('Suivi de commande', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
            const SizedBox(height: 16),
            OrderTimeline(currentStatus: status),
            const SizedBox(height: 24),
            const Text('Articles', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
            const SizedBox(height: 12),
            ...items.map((raw) {
              final item = raw as Map<String, dynamic>;
              final product = item['product'] as Map<String, dynamic>?;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Expanded(child: Text('${product?['name'] ?? 'Produit'} × ${item['quantity']}')),
                    Text(formatFcfa(item['total'] as int), style: const TextStyle(fontWeight: FontWeight.w500)),
                  ],
                ),
              );
            }),
            const Divider(height: 32),
            _SummaryRow('Sous-total', formatFcfa(order['subtotal'] as int)),
            if ((order['deliveryFee'] as int? ?? 0) > 0)
              _SummaryRow('Livraison', formatFcfa(order['deliveryFee'] as int)),
            const SizedBox(height: 8),
            _SummaryRow('Total', formatFcfa(order['total'] as int), bold: true),
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow(this.label, this.value, {this.bold = false});

  final String label;
  final String value;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.normal, fontSize: bold ? 16 : 14)),
          Text(value, style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.w500, color: bold ? AppColors.brand700 : AppColors.slate900)),
        ],
      ),
    );
  }
}

class _LoginPrompt extends StatelessWidget {
  const _LoginPrompt({required this.onLogin});

  final VoidCallback onLogin;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.lock_outline, size: 64, color: AppColors.slate400.withValues(alpha: 0.5)),
            const SizedBox(height: 16),
            const Text('Connectez-vous', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text(
              'Accédez à vos commandes et suivez leur statut en temps réel',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.slate500),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(onPressed: onLogin, child: const Text('Se connecter')),
            ),
          ],
        ),
      ),
    );
  }
}
