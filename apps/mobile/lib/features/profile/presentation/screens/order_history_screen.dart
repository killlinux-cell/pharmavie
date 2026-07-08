import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/api/api_client.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/core/utils/order_status.dart';
import 'package:pharmavie_mobile/core/widgets/app_widgets.dart';
import 'package:pharmavie_mobile/core/widgets/feature_scaffold.dart';

class OrderHistoryScreen extends StatefulWidget {
  const OrderHistoryScreen({super.key});

  @override
  State<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends State<OrderHistoryScreen> {
  final _api = ApiClient();
  List<dynamic> _orders = [];
  bool _loading = true;
  String? _error;
  String _filter = 'all';

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
      final res = await _api.get('/orders');
      setState(() {
        _orders = (res['data'] as List?) ?? [];
        _loading = false;
      });
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  List<dynamic> get _filtered {
    if (_filter == 'active') {
      return _orders.where((o) {
        final s = o['status'] as String? ?? '';
        return !['DELIVERED', 'CANCELLED', 'REJECTED'].contains(s);
      }).toList();
    }
    if (_filter == 'done') {
      return _orders.where((o) => o['status'] == 'DELIVERED').toList();
    }
    return _orders;
  }

  @override
  Widget build(BuildContext context) {
    return FeatureScaffold(
      title: 'Historique commandes',
      subtitle: 'Toutes vos commandes passées et en cours',
      badge: 'Compte',
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: AppColors.red600)))
              : Column(
                  children: [
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                      child: Row(
                        children: [
                          _chip('Toutes', 'all'),
                          const SizedBox(width: 8),
                          _chip('En cours', 'active'),
                          const SizedBox(width: 8),
                          _chip('Livrées', 'done'),
                        ],
                      ),
                    ),
                    Expanded(
                      child: _filtered.isEmpty
                          ? const Center(child: Text('Aucune commande', style: TextStyle(color: AppColors.slate500)))
                          : RefreshIndicator(
                              onRefresh: _load,
                              child: ListView.separated(
                                padding: const EdgeInsets.all(20),
                                itemCount: _filtered.length,
                                separatorBuilder: (_, __) => const SizedBox(height: 10),
                                itemBuilder: (_, i) {
                                  final o = _filtered[i] as Map<String, dynamic>;
                                  final status = OrderStatusUtil.get(o['status'] as String? ?? '');
                                  return Container(
                                    padding: const EdgeInsets.all(14),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(14),
                                      border: Border.all(color: AppColors.border),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Expanded(
                                              child: Text(
                                                '#${((o['id'] as String? ?? '00000000').length >= 8 ? (o['id'] as String).substring(0, 8) : o['id']).toString().toUpperCase()}',
                                                style: const TextStyle(fontWeight: FontWeight.w600),
                                              ),
                                            ),
                                            StatusBadge(label: status.label, color: status.color, bgColor: status.bgColor, icon: status.icon),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        Text(formatFcfa((o['total'] as num?)?.toInt() ?? (o['totalAmount'] as num?)?.toInt() ?? 0), style: const TextStyle(color: AppColors.brand700, fontWeight: FontWeight.bold)),
                                        if (o['createdAt'] != null)
                                          Text(formatDate(o['createdAt'] as String), style: const TextStyle(fontSize: 12, color: AppColors.slate400)),
                                      ],
                                    ),
                                  );
                                },
                              ),
                            ),
                    ),
                  ],
                ),
    );
  }

  Widget _chip(String label, String value) {
    final selected = _filter == value;
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => setState(() => _filter = value),
      selectedColor: AppColors.brand50,
      checkmarkColor: AppColors.brand700,
    );
  }
}
