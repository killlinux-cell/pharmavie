import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/api/api_client.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/core/widgets/app_widgets.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, required this.onAuthenticated});

  final VoidCallback onAuthenticated;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _api = ApiClient();
  final _phoneController = TextEditingController(text: '+225');
  final _codeController = TextEditingController();
  bool _otpSent = false;
  bool _loading = false;
  String? _devCode;
  String? _error;

  @override
  void dispose() {
    _phoneController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await _api.post('/auth/otp/send', {'phone': _phoneController.text}, auth: false);
      setState(() {
        _otpSent = true;
        _devCode = (res['data'] as Map?)?['devCode'] as String?;
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _verifyOtp() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await _api.post('/auth/otp/verify', {
        'phone': _phoneController.text,
        'code': _codeController.text,
      }, auth: false);
      await _api.setToken((res['data'] as Map)['token'] as String);
      widget.onAuthenticated();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.arrow_back),
                style: IconButton.styleFrom(backgroundColor: AppColors.surfaceMuted),
              ),
              const SizedBox(height: 24),
              const Center(child: PharmaLogo(size: 64)),
              const SizedBox(height: 24),
              const Text('Connexion', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text(
                'Pas de mot de passe : votre numéro + un code SMS suffit. À la première connexion, votre compte est créé automatiquement.',
                style: TextStyle(color: AppColors.slate500, fontSize: 15),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.brand50,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  'Mode test dev : utilisez +2250700000003 — le code OTP s\'affiche à l\'écran',
                  style: TextStyle(fontSize: 12, color: AppColors.brand700),
                ),
              ),
              const SizedBox(height: 24),
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Téléphone (+225)',
                  prefixIcon: Icon(Icons.phone_outlined),
                ),
                enabled: !_otpSent,
              ),
              if (_otpSent) ...[
                const SizedBox(height: 16),
                TextField(
                  controller: _codeController,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 24, letterSpacing: 8, fontWeight: FontWeight.bold),
                  decoration: const InputDecoration(
                    labelText: 'Code OTP',
                    counterText: '',
                  ),
                ),
                if (_devCode != null)
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(top: 8),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.brand50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.brand100),
                    ),
                    child: Text(
                      'Code dev : $_devCode',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppColors.brand700, fontWeight: FontWeight.bold, fontSize: 18),
                    ),
                  ),
              ],
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: AppColors.red600, fontSize: 13)),
              ],
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : (_otpSent ? _verifyOtp : _sendOtp),
                  style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                  child: _loading
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(_otpSent ? 'Se connecter' : 'Recevoir le code OTP'),
                ),
              ),
              if (_otpSent)
                TextButton(
                  onPressed: () => setState(() {
                    _otpSent = false;
                    _codeController.clear();
                  }),
                  child: const Text('Changer de numéro'),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
