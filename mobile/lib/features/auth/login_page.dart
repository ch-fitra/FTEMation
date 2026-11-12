import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'session_state.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/brand.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
  @override
  State<LoginPage> createState() => _LoginState();
}

class _LoginState extends State<LoginPage> {
  final username = TextEditingController(), password = TextEditingController();
  final form = GlobalKey<FormState>();
  bool obscure = true;
  @override
  void dispose() {
    username.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (!form.currentState!.validate()) return;
    await context.read<SessionState>().login(username.text, password.text);
    if (mounted) password.clear();
  }

  @override
  Widget build(BuildContext context) => AnnotatedRegion<SystemUiOverlayStyle>(
    value: SystemUiOverlayStyle.light,
    child: Scaffold(
      backgroundColor: AppColors.navy,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Center(child: Brand(large: true)),
                  const SizedBox(height: 32),
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Form(
                      key: form,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'Selamat datang',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 24),
                          TextFormField(
                            controller: username,
                            textInputAction: TextInputAction.next,
                            decoration: const InputDecoration(
                              labelText: 'Username',
                            ),
                            autocorrect: false,
                            validator: (v) => v == null || v.trim().isEmpty
                                ? 'Isi username.'
                                : null,
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: password,
                            obscureText: obscure,
                            enableSuggestions: false,
                            autocorrect: false,
                            decoration: InputDecoration(
                              labelText: 'Password',
                              suffixIcon: IconButton(
                                tooltip: 'Tampilkan atau sembunyikan password',
                                onPressed: () =>
                                    setState(() => obscure = !obscure),
                                icon: Icon(
                                  obscure
                                      ? Icons.visibility
                                      : Icons.visibility_off,
                                ),
                              ),
                            ),
                            validator: (v) =>
                                v == null || v.isEmpty ? 'Isi password.' : null,
                            onFieldSubmitted: (_) {
                              if (!context.read<SessionState>().busy) submit();
                            },
                          ),
                          if (context.watch<SessionState>().error
                              case final String error)
                            Padding(
                              padding: const EdgeInsets.only(top: 12),
                              child: Text(
                                error,
                                style: const TextStyle(color: Colors.red),
                              ),
                            ),
                          const SizedBox(height: 24),
                          FilledButton.icon(
                            onPressed: context.watch<SessionState>().busy
                                ? null
                                : submit,
                            icon: const Icon(Icons.login),
                            label: Text(
                              context.watch<SessionState>().busy
                                  ? 'Sedang masuk...'
                                  : 'Masuk',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
