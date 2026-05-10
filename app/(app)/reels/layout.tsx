/* Layout dédié /reels : override le layout (app) par défaut.
 *
 * Reels est une expérience fullscreen immersive — on retire :
 *   - LeftSidebar (xl)
 *   - TopBar (mobile)
 *   - MobileBottomNav
 *   - tout padding/margin du layout parent
 *
 * Le layout (app) parent est gardé via children (pour les Providers
 * VideoPlayerProvider, CreatorProvider, ConfirmProvider, etc.) mais
 * son visuel est masqué par le `fixed inset-0` ci-dessous.
 */
export default function ReelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      {children}
    </div>
  );
}
