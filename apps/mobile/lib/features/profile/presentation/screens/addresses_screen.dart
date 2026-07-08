import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/api/api_client.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/core/widgets/feature_scaffold.dart';

class AddressesScreen extends StatefulWidget {
  const AddressesScreen({super.key});

  @override
  State<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends State<AddressesScreen> {
  final _api = ApiClient();
  List<dynamic> _addresses = [];
  bool _loading = true;
  final _streetController = TextEditingController();
  final _labelController = TextEditingController(text: 'Maison');

  @override
  void dispose() {
    _streetController.dispose();
    _labelController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await _api.get('/users/me/addresses');
      setState(() {
        _addresses = (res['data'] as List?) ?? [];
        _loading = false;
      });
    } on ApiException catch (e) {
      setState(() => _loading = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _add() async {
    final street = _streetController.text.trim();
    if (street.isEmpty) return;
    try {
      await _api.post('/users/me/addresses', {
        'street': street,
        'label': _labelController.text.trim(),
        'city': 'Abidjan',
        'isDefault': _addresses.isEmpty,
      });
      _streetController.clear();
      await _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  Future<void> _delete(String id) async {
    try {
      await _api.delete('/users/me/addresses/$id');
      await _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return FeatureScaffold(
      title: 'Mes adresses',
      subtitle: 'Adresses de livraison enregistrées',
      badge: 'Compte',
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                ..._addresses.map((a) {
                  final map = a as Map<String, dynamic>;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
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
                              Text(map['label'] as String? ?? 'Adresse', style: const TextStyle(fontWeight: FontWeight.w600)),
                              Text(map['street'] as String? ?? '', style: const TextStyle(color: AppColors.slate500, fontSize: 13)),
                              if (map['isDefault'] == true)
                                const Text('Par défaut', style: TextStyle(fontSize: 11, color: AppColors.brand600)),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: () => _delete(map['id'] as String),
                          icon: const Icon(Icons.delete_outline, color: AppColors.red600),
                        ),
                      ],
                    ),
                  );
                }),
                const SizedBox(height: 16),
                const Text('Ajouter une adresse', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                TextField(controller: _labelController, decoration: const InputDecoration(labelText: 'Libellé')),
                const SizedBox(height: 8),
                TextField(controller: _streetController, decoration: const InputDecoration(labelText: 'Rue / quartier')),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(onPressed: _add, child: const Text('Enregistrer')),
                ),
              ],
            ),
    );
  }
}
