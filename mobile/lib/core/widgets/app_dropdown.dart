import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

class AppDropdownItem<T> {
  const AppDropdownItem({required this.value, required this.label});
  final T value;
  final String label;
}

/// Controlled selection: IDs and callbacks remain owned by the calling page.
class AppDropdown<T> extends StatefulWidget {
  const AppDropdown({
    super.key,
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
  });
  final String label;
  final T? value;
  final List<AppDropdownItem<T>> items;
  final ValueChanged<T?>? onChanged;

  @override
  State<AppDropdown<T>> createState() => _AppDropdownState<T>();
}

class _AppDropdownState<T> extends State<AppDropdown<T>> {
  bool open = false;

  Future<void> choose() async {
    FocusManager.instance.primaryFocus?.unfocus();
    // Capture the current choices; discard selections if data changes meanwhile.
    final choices = widget.items;
    final previous = widget.value;
    setState(() => open = true);
    final picked = await showModalBottomSheet<AppDropdownItem<T>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      sheetAnimationStyle: MediaQuery.disableAnimationsOf(context)
          ? AnimationStyle.noAnimation
          : const AnimationStyle(
              duration: Duration(milliseconds: 180),
              reverseDuration: Duration(milliseconds: 140),
            ),
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.viewInsetsOf(sheetContext).bottom,
        ),
        child: SafeArea(
          top: false,
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.sizeOf(sheetContext).height * .65,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                  child: Text(widget.label,
                      style: Theme.of(context).textTheme.titleLarge),
                ),
                Flexible(
                  child: ListView.builder(
                    shrinkWrap: true,
                    padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
                    itemCount: choices.length,
                    itemBuilder: (context, index) {
                      final item = choices[index];
                      final selected = item.value == previous;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Material(
                          color: selected
                              ? AppColors.cyan.withValues(alpha: .10)
                              : AppColors.surface,
                          borderRadius: BorderRadius.circular(12),
                          clipBehavior: Clip.antiAlias,
                          child: ListTile(
                            selected: selected,
                            selectedColor: AppColors.navy,
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 6),
                            // Wrap full filenames in the picker; truncate only
                            // the closed field.
                            title: Text(item.label,
                                style: TextStyle(
                                  fontWeight: selected
                                      ? FontWeight.w600
                                      : FontWeight.w400,
                                )),
                            trailing: selected
                                ? const Icon(Icons.check_rounded,
                                    color: AppColors.primary)
                                : null,
                            onTap: () => Navigator.pop(sheetContext, item),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    if (!mounted) return;
    setState(() => open = false);
    if (picked != null && widget.value == previous &&
        widget.items.any((item) =>
            item.value == picked.value && item.label == picked.label)) {
      widget.onChanged?.call(picked.value);
    }
  }

  @override
  Widget build(BuildContext context) {
    String? selectedLabel;
    for (final item in widget.items) {
      if (item.value == widget.value) selectedLabel = item.label;
    }
    final enabled = widget.onChanged != null && widget.items.isNotEmpty;
    return Semantics(
      button: true,
      expanded: open,
      child: Material(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: enabled ? choose : null,
          borderRadius: BorderRadius.circular(12),
          focusColor: AppColors.cyan.withValues(alpha: .10),
          child: InputDecorator(
            isFocused: open,
            decoration: InputDecoration(
              labelText: widget.label,
              enabled: enabled,
              contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14, vertical: 14),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    selectedLabel ?? 'Pilih ${widget.label.toLowerCase()}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: enabled ? AppColors.text : AppColors.muted,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                AnimatedRotation(
                  turns: open ? .5 : 0,
                  duration: MediaQuery.disableAnimationsOf(context)
                      ? Duration.zero
                      : const Duration(milliseconds: 160),
                  child: const Icon(Icons.keyboard_arrow_down_rounded,
                      color: AppColors.muted, size: 22),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
