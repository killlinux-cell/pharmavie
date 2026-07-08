import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/api/api_client.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';

class AiChatScreen extends StatefulWidget {
  const AiChatScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  State<AiChatScreen> createState() => _AiChatScreenState();
}

class _AiChatScreenState extends State<AiChatScreen> {
  final _api = ApiClient();
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final _messages = <Map<String, dynamic>>[];
  String? _sessionId;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _messages.add({
      'role': 'assistant',
      'content':
          'Bonjour 👋 Je suis l\'assistant PharmaVie.\n\n'
          'Décrivez vos symptômes et je vous orienterai vers le bon professionnel de santé.\n\n'
          '⚠️ Je ne pose pas de diagnostic et ne prescris aucun médicament.',
      'urgency': 'normal',
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _loading) return;

    setState(() {
      _messages.add({'role': 'user', 'content': text});
      _loading = true;
    });
    _controller.clear();
    _scrollToBottom();

    try {
      final res = await _api.post('/ai/chat', {
        'message': text,
        if (_sessionId != null) 'sessionId': _sessionId,
      }, auth: false);

      final data = res['data'] as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        _sessionId = data['sessionId'] as String?;
        _messages.add({
          'role': 'assistant',
          'content': data['reply'] as String,
          'urgency': data['urgency'] ?? 'normal',
          'specialist': data['suggestedSpecialist'],
        });
        _loading = false;
      });
      _scrollToBottom();
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e is ApiException ? e.message : 'Erreur assistant')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final body = Column(
      children: [
        if (widget.embedded)
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.brand50,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.auto_awesome, color: AppColors.brand600),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Assistant santé', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                      Text('Orientation médicale intelligente', style: TextStyle(fontSize: 12, color: AppColors.slate500)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        Container(
          width: double.infinity,
          margin: EdgeInsets.all(widget.embedded ? 16 : 0),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.amber50,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.amber600.withValues(alpha: 0.2)),
          ),
          child: const Row(
            children: [
              Icon(Icons.medical_information_outlined, size: 18, color: AppColors.amber600),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Information indicative — consultez un professionnel.',
                  style: TextStyle(fontSize: 12, color: AppColors.amber600, fontWeight: FontWeight.w500),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            controller: _scrollController,
            padding: const EdgeInsets.all(16),
            itemCount: _messages.length + (_loading ? 1 : 0),
            itemBuilder: (context, index) {
              if (_loading && index == _messages.length) {
                return const Align(
                  alignment: Alignment.centerLeft,
                  child: Padding(
                    padding: EdgeInsets.all(12),
                    child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2)),
                  ),
                );
              }
              final msg = _messages[index];
              final isUser = msg['role'] == 'user';
              final isUrgent = msg['urgency'] == 'urgent';

              return Align(
                alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(14),
                  constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.82),
                  decoration: BoxDecoration(
                    color: isUser
                        ? AppColors.brand600
                        : isUrgent
                            ? AppColors.red50
                            : Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(18),
                      topRight: const Radius.circular(18),
                      bottomLeft: Radius.circular(isUser ? 18 : 4),
                      bottomRight: Radius.circular(isUser ? 4 : 18),
                    ),
                    border: isUser ? null : Border.all(color: isUrgent ? AppColors.red600.withValues(alpha: 0.3) : AppColors.border),
                    boxShadow: isUser
                        ? null
                        : [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (!isUser)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.smart_toy_outlined, size: 14, color: isUrgent ? AppColors.red600 : AppColors.brand600),
                              const SizedBox(width: 4),
                              Text(
                                'PharmaVie IA',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: isUrgent ? AppColors.red600 : AppColors.brand600),
                              ),
                            ],
                          ),
                        ),
                      Text(
                        msg['content'] as String,
                        style: TextStyle(
                          color: isUser ? Colors.white : AppColors.slate900,
                          height: 1.45,
                          fontSize: 14,
                        ),
                      ),
                      if (msg['specialist'] != null) ...[
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppColors.brand50,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.person_search, size: 14, color: AppColors.brand700),
                              const SizedBox(width: 6),
                              Text(
                                '→ ${msg['specialist']}',
                                style: const TextStyle(fontSize: 12, color: AppColors.brand700, fontWeight: FontWeight.w500),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        Container(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: AppColors.border.withValues(alpha: 0.5))),
          ),
          child: SafeArea(
            top: false,
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: InputDecoration(
                      hintText: 'Décrivez vos symptômes...',
                      filled: true,
                      fillColor: AppColors.surfaceMuted,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    ),
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _send(),
                  ),
                ),
                const SizedBox(width: 8),
                Material(
                  color: AppColors.brand600,
                  borderRadius: BorderRadius.circular(24),
                  child: InkWell(
                    onTap: _loading ? null : _send,
                    borderRadius: BorderRadius.circular(24),
                    child: const Padding(
                      padding: EdgeInsets.all(12),
                      child: Icon(Icons.send_rounded, color: Colors.white, size: 22),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );

    if (widget.embedded) {
      return Scaffold(backgroundColor: AppColors.surfaceMuted, body: SafeArea(child: body));
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Assistant santé IA')),
      body: body,
    );
  }
}
