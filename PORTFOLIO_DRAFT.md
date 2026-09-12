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

## Pointer fan refinement — 12 September

- Mouse position now traverses the full featured collection, with hover lift and direct card opening. Visible previous/next controls removed; keyboard arrows and touch swipes retained.
- Removed the extra phone shell around screenshots which already include a device. Added headroom for lifted portrait captures.
- Browser verification: pointer traversal reached DSH Studio and Pozla Recap; direct Pozla card click opened the matching dialog. All 36 project screenshots loaded after traversing the archive (no pending or broken images); all 44 checked resources returned HTTP 200. Mobile width 390 had no horizontal overflow.
- The local preview server had stopped, consistent with delayed image requests failing. Restarted independently of the command session; logs and PID are in the preparation review directory. Production was not changed.

### Stable pointer approach

Browse only from the empty outer edges; the central approach area and card hover stop lateral motion. Hover retains the card angle and uses a short scale transition instead of abruptly changing depth and rotation. Verified actual mouse paths from both edges to the centered card: DSH Studio and Pozla Recap stayed under the pointer and opened the correct dialog on direct click.

### Adjacent-card hit testing correction

Removed endpoint browsing after user found intermediate cards inaccessible. Fan now has bounded pointer parallax and direct hover selection without recentering. Removed negative Z placement and flattened the deck stacking context: visible rear cards had not received hit tests. Uniform card hit areas retain access to portrait projects without adding a device shell. Browser evidence: all nine featured cards opened their matching dialogs by actual coordinate clicks on visible portions, including both adjacent cards and both endpoints.

### Pointer-anchored scrolling

The fan now scrolls continuously across the collection, with the selected card anchored to the pointer horizontal position instead of the viewport center. Retained flat hit testing and smooth hover scaling. Browser verification at all nine horizontal selection positions: moving into the fan then clicking without repositioning opened the corresponding project in every case. Separately verified Africa Atlas and Sift under the exact pointer position after long cross-stage movements.

### Keep endpoint cards inside the viewport

Inset both the pointer mapping and card anchor by half the enlarged card width plus 18px. Pointer travel through this edge buffer retains the endpoint selection, so approaching the full visible card does not select its neighbour. Verified both endpoint dialogs by mouse clicks on desktop; at mobile width 390, the enlarged final card ended at 357 inside the 375px stage, leaving 18px clearance.

## Video previews, 12 September

Eight featured projects now have local H.264 MP4 footage: DSH Studio, Africa Atlas, Template Studio, Pozla Camera, Rauf Tuncer, Latent, Sift and Pozla Recap. Combined transfer size is about 3.6 MB. Capture provenance is in media-manifest.json. Browser recordings use isolated English demos; iOS recordings use the isolated simulator apps. Recap is the application output with explicitly synthetic sample event images. DSH uses its existing demo recording. Cutaway retains its screenshot because the demonstrated copy stops before configured model discovery. Other archive projects retain their existing screenshots or evidence cards.

Hover or keyboard focus plays a muted inline preview, with only one active preview. Offscreen, hidden page, project dialog, reduced motion and data saving states stop or suppress it. Video files load on demand. Project details show controls and preserve a screenshot poster. Mobile portrait videos are constrained to the media area.

Verification: all eight MP4 resources returned HTTP 200 and decoded; frame contact sheets reviewed. Browser playback observed without media errors. Mobile Pozla playback advanced beyond seven seconds with readyState 4. Mobile video bottom 434 was above the project heading at 521, with no horizontal overflow. All 49 project copy records passed the prohibited dash check, as did the rendered homepage text and title. Not a production deployment.

Capture originals and packaging script live in the preparation folder, output/playwright/videos and scripts/package_portfolio_videos.py. The project generator now preserves media assignments.
