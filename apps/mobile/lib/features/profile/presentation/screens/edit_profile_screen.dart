import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/api/api_client.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/core/widgets/feature_scaffold.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key, required this.profile, required this.onSaved});

  final Map<String, dynamic> profile;
  final VoidCallback onSaved;

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _api = ApiClient();
  late final TextEditingController _firstName;
  late final TextEditingController _lastName;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _firstName = TextEditingController(text: widget.profile['firstName'] as String? ?? '');
    _lastName = TextEditingController(text: widget.profile['lastName'] as String? ?? '');
  }

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await _api.patch('/users/me', {
        'firstName': _firstName.text.trim(),
        'lastName': _lastName.text.trim(),
      });
      if (!mounted) return;
      widget.onSaved();
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profil mis à jour')),
      );
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final phone = widget.profile['phone'] as String? ?? '';

    return FeatureScaffold(
      title: 'Modifier mon profil',
      subtitle: 'Informations personnelles',
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          TextField(
            enabled: false,
            decoration: InputDecoration(
              labelText: 'Téléphone',
              prefixIcon: const Icon(Icons.phone_outlined),
              helperText: 'Le numéro ne peut pas être modifié',
              filled: true,
              fillColor: AppColors.surfaceMuted,
            ),
            controller: TextEditingController(text: phone),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _firstName,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(
              labelText: 'Prénom',
              prefixIcon: Icon(Icons.person_outline),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _lastName,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(
              labelText: 'Nom',
              prefixIcon: Icon(Icons.person_outline),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppColors.red600)),
          ],
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _loading ? null : _save,
              child: _loading
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Enregistrer'),
            ),
          ),
        ],
      ),
    );
  }
}
