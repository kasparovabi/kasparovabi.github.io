# Product showcase — first draft

## Reference refinement — 12 September

The supplied fan HTML was inspected for layout and interaction behavior. Its embedded photographs and videos were not copied. The product fan now uses depth, Y-axis rotation, restrained pointer drift and a lifted hover/focus state. Each card opens its project directly. Arrow buttons, keyboard navigation and a horizontal touch-swipe handler remain available. Animation work stops when the fan is outside the viewport or a dialog is open; reduced-motion preferences remove animated transitions.

The warm cream/green palette was replaced with cold gray, ink and red; typography, controls, corners and shadows were adjusted together. The featured Poz card now uses the Pozla iOS onboarding capture (`anikamerasi`), rendered in portrait proportions.

Verified in browser: 9 cards, keyboard focus/lift, arrow selection, Pozla iOS dialog, Escape and focus restoration, Mobile + Pozla returning one archive result, no console errors in the inspected log. A 390 × 844 viewport showed no horizontal overflow and the correct phone card; viewport override was reset afterward. Physical touch gesture verification and video capture remain pending.

Separate branch: `portfolio/product-showcase`. This draft has not been deployed to the live GitHub Pages site.

Run `python3 -m http.server 8932 --bind 127.0.0.1` from this directory.

The home page presents nine featured projects in an interactive fan of product windows. All 49 selected projects are available through category filters and search. Project dialogs show the actual captured interface and a bounded verification note. There are 36 screenshots; projects without a verified interface capture use clearly labeled source notes or work-in-progress cards. No videos have been recorded or added in this draft. The data structure supports an optional video for a later iteration.

Original homepage retained verbatim as `cv.html`; its supporting assets and existing CV files remain intact. Portrait and contact information come from the existing website. Text and project names are first-draft editorial copy, ready for owner review.

Verified: JavaScript syntax, live browser project navigation and dialog opening, Escape closing/focus return, combined Mobile + Latent filter, zero-result search, and a 390 × 844 CSS iframe layout with a working project dialog. This narrow layout check is not a physical phone test.

Pending: owner feedback on the visual direction and selection; short real-use clips; project-specific contribution stories; broader device/accessibility checks; publication after review.
