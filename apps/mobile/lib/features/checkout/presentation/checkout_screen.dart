import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/api/api_client.dart';
import 'package:pharmavie_mobile/core/services/cart_service.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/core/utils/order_status.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key, required this.items});

  final List<CartItem> items;

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _api = ApiClient();
  String _type = 'PICKUP';
  String _paymentMethod = 'ORANGE_MONEY';
  String _address = '';
  bool _loading = false;
  bool _loadingRx = true;
  List<dynamic> _validatedPrescriptions = [];
  String? _prescriptionId;
  late final TextEditingController _phoneController;

  String get _pharmacyId => widget.items.first.pharmacyId;
  String get _pharmacyName => widget.items.first.pharmacyName;
  bool get _needsRx => widget.items.any((i) => i.requiresRx);

  @override
  void initState() {
    super.initState();
    _phoneController = TextEditingController(text: '+2250700000003');
    if (_needsRx) {
      _loadPrescriptions();
    } else {
      _loadingRx = false;
    }
  }

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _loadPrescriptions() async {
    try {
      final res = await _api.get('/prescriptions');
      final all = (res['data'] as List?) ?? [];
      setState(() {
        _validatedPrescriptions = all.where((p) {
          final map = p as Map<String, dynamic>;
          if (map['status'] != 'VALIDATED') return false;
          final phId = map['pharmacyId'] as String?;
          return phId == null || phId == _pharmacyId;
        }).toList();
        if (_validatedPrescriptions.length == 1) {
          _prescriptionId = (_validatedPrescriptions.first as Map)['id'] as String;
        }
        _loadingRx = false;
      });
    } on ApiException {
      setState(() => _loadingRx = false);
    }
  }

  int get _deliveryFee => _type == 'DELIVERY' ? 1500 : 0;
  int get _subtotal => widget.items.fold(0, (s, i) => s + i.lineTotal);
  int get _total => _subtotal + _deliveryFee;

  Future<void> _placeOrder() async {
    if (_needsRx && _prescriptionId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sélectionnez une ordonnance validée par la pharmacie')),
      );
      return;
    }
    if (_type == 'DELIVERY' && _address.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez indiquer une adresse de livraison')),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      final orderRes = await _api.post('/orders', {
        'pharmacyId': _pharmacyId,
        'type': _type,
        'items': widget.items
            .map((i) => {'productId': i.productId, 'quantity': i.quantity})
            .toList(),
        if (_type == 'DELIVERY') 'deliveryAddress': _address,
        if (_prescriptionId != null) 'prescriptionId': _prescriptionId,
      });

      final order = orderRes['data'] as Map<String, dynamic>;
      final payRes = await _api.post('/payments/initiate', {
        'orderId': order['id'],
        'method': _paymentMethod,
        'phone': _phoneController.text,
      });

      final payment = payRes['data'] as Map<String, dynamic>;
      if (_paymentMethod != 'CASH') {
        await _api.post('/payments/webhook', {
          'transactionId': payment['transactionId'],
          'status': 'SUCCESS',
          'providerRef': payment['providerRef'] ?? payment['transactionId'],
        }, auth: false);
      }

      CartService.instance.clear();

      if (mounted) {
        Navigator.popUntil(context, (route) => route.isFirst);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_paymentMethod == 'CASH' ? 'Commande créée — paiement à la livraison' : 'Commande confirmée et payée !'),
            backgroundColor: AppColors.brand600,
          ),
        );
      }
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loadingRx) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Finaliser la commande')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          ...widget.items.map((item) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Container(
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
                            Text('× ${item.quantity}', style: const TextStyle(color: AppColors.slate500, fontSize: 13)),
                          ],
                        ),
                      ),
                      Text(formatFcfa(item.lineTotal), style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.brand700)),
                    ],
                  ),
                ),
              )),
          Text(_pharmacyName, style: const TextStyle(color: AppColors.slate500, fontSize: 13)),
          if (_needsRx) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: AppColors.amber50, borderRadius: BorderRadius.circular(12)),
              child: const Row(
                children: [
                  Icon(Icons.description_outlined, color: AppColors.amber600),
                  SizedBox(width: 8),
                  Expanded(child: Text('Ordonnance validée requise', style: TextStyle(color: AppColors.amber600, fontWeight: FontWeight.w500))),
                ],
              ),
            ),
            if (_validatedPrescriptions.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 12),
                child: Text(
                  'Aucune ordonnance validée pour cette pharmacie. Importez une ordonnance dans Découvrir et attendez la validation.',
                  style: TextStyle(color: AppColors.red600, fontSize: 13),
                ),
              )
            else
              ..._validatedPrescriptions.map((p) {
                final map = p as Map<String, dynamic>;
                final id = map['id'] as String;
                final date = map['createdAt'] as String?;
                return RadioListTile<String>(
                  value: id,
                  groupValue: _prescriptionId,
                  onChanged: (v) => setState(() => _prescriptionId = v),
                  title: Text('Ordonnance du ${date != null ? formatDate(date) : '—'}'),
                  subtitle: const Text('Validée par la pharmacie'),
                );
              }),
          ],
          const SizedBox(height: 24),
          const _SectionTitle('Mode de retrait'),
          Row(
            children: [
              Expanded(child: _OptionChip(label: 'Retrait', icon: Icons.store, selected: _type == 'PICKUP', onTap: () => setState(() => _type = 'PICKUP'))),
              const SizedBox(width: 10),
              Expanded(child: _OptionChip(label: 'Livraison', icon: Icons.delivery_dining, selected: _type == 'DELIVERY', onTap: () => setState(() => _type = 'DELIVERY'))),
            ],
          ),
          if (_type == 'DELIVERY') ...[
            const SizedBox(height: 12),
            TextField(
              decoration: const InputDecoration(labelText: 'Adresse de livraison', hintText: 'Cocody, Abidjan...'),
              onChanged: (v) => _address = v,
            ),
          ],
          const SizedBox(height: 24),
          const _SectionTitle('Paiement'),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _PaymentChip('Orange Money', 'ORANGE_MONEY', _paymentMethod, (v) => setState(() => _paymentMethod = v)),
              _PaymentChip('MTN MoMo', 'MTN_MOMO', _paymentMethod, (v) => setState(() => _paymentMethod = v)),
              _PaymentChip('Wave', 'WAVE', _paymentMethod, (v) => setState(() => _paymentMethod = v)),
              _PaymentChip('Espèces', 'CASH', _paymentMethod, (v) => setState(() => _paymentMethod = v)),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            decoration: const InputDecoration(labelText: 'Numéro Mobile Money', prefixIcon: Icon(Icons.phone)),
            keyboardType: TextInputType.phone,
            controller: _phoneController,
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.brand50,
              borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
              border: Border.all(color: AppColors.brand100),
            ),
            child: Column(
              children: [
                _PriceRow('Sous-total', formatFcfa(_subtotal)),
                if (_deliveryFee > 0) _PriceRow('Livraison', formatFcfa(_deliveryFee)),
                const Divider(height: 24),
                _PriceRow('Total', formatFcfa(_total), bold: true),
              ],
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _loading || (_needsRx && (_prescriptionId == null || _validatedPrescriptions.isEmpty)) ? null : _placeOrder,
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
              child: _loading
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text('Payer ${formatFcfa(_total)}'),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
  final String text;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(text, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
    );
  }
}

class _OptionChip extends StatelessWidget {
  const _OptionChip({required this.label, required this.icon, required this.selected, required this.onTap});
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppColors.brand50 : Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: selected ? AppColors.brand600 : AppColors.border, width: selected ? 2 : 1),
          ),
          child: Column(
            children: [
              Icon(icon, color: selected ? AppColors.brand600 : AppColors.slate400),
              const SizedBox(height: 6),
              Text(label, style: TextStyle(fontWeight: selected ? FontWeight.w600 : FontWeight.normal)),
            ],
          ),
        ),
      ),
    );
  }
}

class _PaymentChip extends StatelessWidget {
  const _PaymentChip(this.label, this.value, this.selected, this.onSelect);
  final String label;
  final String value;
  final String selected;
  final ValueChanged<String> onSelect;
  @override
  Widget build(BuildContext context) {
    final isSelected = selected == value;
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => onSelect(value),
      selectedColor: AppColors.brand50,
      checkmarkColor: AppColors.brand700,
    );
  }
}

class _PriceRow extends StatelessWidget {
  const _PriceRow(this.label, this.value, {this.bold = false});
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
          Text(label, style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
          Text(value, style: TextStyle(fontWeight: FontWeight.bold, color: bold ? AppColors.brand700 : AppColors.slate900)),
        ],
      ),
    );
  }
}
