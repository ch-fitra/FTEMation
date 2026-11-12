import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class Brand extends StatelessWidget {
  const Brand({super.key, this.large = false});
  final bool large;
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      SvgPicture.asset(
        'assets/icons/ftemation-mark.svg',
        colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
        width: large ? 64 : 32,
        height: large ? 64 : 32,
      ),
      const SizedBox(width: 8),
      Flexible(
        child: Text(
          'FTEMation.',
          style: TextStyle(
            color: Colors.white,
            fontSize: large ? 30 : 22,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.8,
          ),
        ),
      ),
    ],
  );
}
