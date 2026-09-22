# Flexischools take-home

Two small apps in one repo. `apps/web` is a React + TypeScript + Tailwind supplier
onboarding form: three steps (business details, service details, review), client-side
validation, and a mocked submit. `apps/mobile` is an Expo React Native POS order screen:
a canteen menu grouped by category, quantity controls per product, a running total, and
a review sheet with a mocked submit. Both apps use a local mock API with artificial
latency and a failure switch, so the error paths can be exercised without a backend. The
two apps are independent and are installed and run separately.

## How to run

Node 20 or later. Each app has its own `package.json` and lockfile, so install in each
directory.

### Web (`apps/web`)

```bash
cd apps/web
npm install
npm run dev     # http://localhost:5173
npm test        # vitest, 106 tests
npm run lint    # eslint
npm run build   # tsc -b && vite build
```

### Mobile (`apps/mobile`)

```bash
cd apps/mobile
npm install
npm start       # expo start, prints a QR code
npm test        # jest, 23 tests
npm run lint    # expo lint
```

To run it on a phone with Expo Go:

1. Install Expo Go from the App Store or Play Store. This project is on Expo SDK 57, so
   the Expo Go version needs to support SDK 57.
2. Put the phone and the computer on the same Wi-Fi network.
3. Run `npm start` in `apps/mobile`.
4. iOS: scan the QR code with the Camera app. Android: scan it from inside Expo Go.
5. If the phone cannot reach the dev server, for example on a locked-down corporate or
   guest network, run `npx expo start --tunnel` instead.

Simulators work too: press `i` for the iOS simulator or `a` for an Android emulator in
the terminal running `npm start`.

## Key design decisions and trade-offs

### Web

- **Validation is plain TypeScript functions.** The rules are small and specific (ABN,
  Australian phone, a date floor), and a form library would add indirection around them.
  Each validator is a pure function taking a partial form object, so the tests exercise
  the rules directly with nothing rendered.
- **Native inputs, styled with Tailwind.** Every control on these steps is a text input,
  a select or a date input, all of which browsers handle well, including on mobile. For a
  widget with real interaction logic, such as a combobox or a date picker, I would reach
  for a headless library like Radix.
- **ABN uses the official checksum.** Subtract 1 from the first digit, apply the ATO's
  positional weights, and check the total is divisible by 89. A length check on its own
  accepts transposed digits; the checksum catches them.
- **Start dates compare as local `YYYY-MM-DD` strings.** `toISOString()` shifts to UTC,
  which puts anyone east of Greenwich on the wrong day in the early morning, so today is
  built from the local date parts. String comparison then works because the format is
  zero-padded and ordered. The date tests pass a fixed clock at 00:30 and again at 23:30
  local time, so a UTC implementation fails the suite in whichever timezone it runs.
- **Errors appear after blur or a failed Next, then clear live.** Showing an error while
  someone is still typing their email for the first time is noise. Once a field is
  touched, its error updates on every keystroke, so it disappears as soon as the value is
  fixed. A failed Next marks every field on the step as touched, so all of the problems
  surface at once.
- **Focus is moved deliberately.** A failed Next focuses the first invalid field in
  visual order. A step change focuses the step heading, which carries `tabIndex={-1}`, so
  a screen reader announces the new step. Focus runs in an effect, which guarantees the
  error text and its `aria-describedby` target are already in the DOM.
- **`role="alert"` sits only on the submit error.** Field errors are tied to their input
  through `aria-describedby`, so a screen reader reads them when focus arrives; making
  them live regions would interrupt the user mid-keystroke. The submit failure has no
  such anchor and appears away from where focus sits, so it announces itself.
- **The review step is generated from the same field config as the form.** One array of
  steps and field names drives the form, the first-invalid-field lookup and the review
  rows, so a new field shows up in all three at once.
- **Double-submit is guarded with a ref.** Several clicks fired before React re-renders
  all read the same stale status, and the `disabled` attribute is not on the DOM element
  yet. A ref flips synchronously, so the second click returns early. A test clicks the
  button three times and asserts one API call.
- **The success screen offers a reset.** It clears values, touched state, step and
  status, which also makes filling in a second application testable.

### Mobile

- **Prices are integer cents.** Money stays in integers the whole way through, and
  `formatCents` converts to dollars once, at the point of display.
- **Order state is a pure reducer.** One screen and five actions do not justify a state
  library. The `default` case assigns the action to `never`, so adding an action without
  handling it is a compile error. Every rule worth testing lives there: merging a repeat
  add into one line, dropping a line at quantity zero, refusing an unavailable product.
  The reducer tests call it directly with nothing rendered.
- **`ProductCategory` is a union type.** A typo in a category is a compile error, and the
  section list cannot end up with a category nothing renders.
- **`SectionList` grouped by category.** It is the built-in component for this shape and
  brings virtualisation and sticky-capable headers. Sections are derived from the order
  the products appear in, so the data file controls the category order.
- **Unavailable items stay on the menu, disabled.** Staff need to know that the item
  exists and is sold out. The row is dimmed, labelled "Sold out", and its Add button gets
  `accessibilityState={{ disabled: isUnavailable }}`, so assistive tech reports what the
  visual design shows. The reducer refuses the add as well, so enforcement does not
  depend on the UI.
- **44pt minimum touch targets, and product names in accessibility labels.** Every button
  is at least 44pt, and labels read "Increase quantity of Beef Pie", which matters when
  the screen is rows of identical controls.
- **Rows are memoised with stable callbacks.** `ProductRow` is wrapped in `memo`, and the
  handlers are `useCallback` with empty dependency lists that dispatch by product id, so
  changing one quantity re-renders one row.
- **Stale fetch responses are ignored.** Each load takes a request id, and a response
  whose id is no longer the latest is dropped. Without it, a slow first request landing
  after a retry overwrites the newer result.
- **Review is a `Modal`.** One extra screen does not justify a navigation library. The
  modal renders in its own native view hierarchy, so it needs its own `SafeAreaProvider`;
  the app's insets give it the wrong padding.
- **Submit state resets by remounting.** The screen hands `OrderReviewModal` a new `key`
  each time the sheet opens, so every open starts from clean state. Clearing it from
  inside the modal would mean writing state in an effect, and doing it on close or on the
  modal's `onShow` would flash the previous order's result during the slide animation.
- **The Review button is disabled while the order is empty**, with a matching
  `accessibilityState`, so an empty order cannot reach the submit screen. Clear is hidden
  entirely when there is nothing to clear.
- **A failed submit keeps the order.** The error appears in the modal footer as a polite
  live region and the button becomes Retry, resubmitting exactly what failed. An
  in-flight ref blocks a double submit for the same reason as on the web.

## What I prioritised and what remains incomplete

Prioritised: the logic that is easy to get subtly wrong and expensive to get wrong in
production. That means the validation rules, the order reducer, and the submit flows
including loading, failure, retry and double submit. Accessibility was built in as the
work went along, because retrofitting labels and focus order costs far more than writing
them in. The tests concentrate on the same areas: the pure functions are covered
thoroughly, and the component tests walk the flows a user walks.

Incomplete:

- **Mobile: no product search.** With 15 products a plain list is fine; a real canteen
  menu would need one.
- **Mobile: phone layout only.** There is no tablet or landscape treatment, which a real
  POS would need.
- **Mobile: no component tests for the loading, error and retry states.**
  `ProductListScreen` has two component tests, covering the summary total after an add
  and the disabled Review button on an empty order. The loading spinner, the error
  message and the retry path have only been checked by hand.
- **No availability re-check.** If a product sells out while it is already in an order,
  nothing notices. The reducer refuses to add an unavailable product, and an existing
  line goes unchecked at submit time.
- **No shared package.** `Product`-style types and design tokens are defined per app.
- **No product images**, no persistence, and no unsaved-changes warning on the web form
  if the tab is closed mid-application.

## Assumptions

- No backend exists. Both apps use a local mock API with fixed latency and an exported
  failure switch, and the payloads that would go over the wire are the app's own types.
- The audience is Australian: ABN, Australian phone formats, and dollars.
- Phone numbers are entered as digits and spaces. The validator rejects `+61` prefixes;
  normalising them is a deliberate omission I would revisit with a real spec.
- A start date of today or later is acceptable.
- The POS is single-device and single-order. No auth, no user accounts, no concurrent
  orders, and no payment step beyond the confirmation screen.
- The canteen menu is static reference data, so it lives in a file and the mock API
  serves it directly.
- Prices exclude any discount, surcharge or GST handling.

## What I would do next with more time

1. Add product search and a tablet layout to the mobile app, and an unsaved-changes
   warning to the web form.
2. Cover the mobile loading, error and retry states with component tests.
3. Re-check availability at submit time, so an item that sells out while it sits in an
   order is caught before the order goes through.
4. Extract a shared package for types and design tokens, so the two apps stay agreed on
   what a `Product` is and what the primary colour means.
5. Add product images with `expo-image`, which handles caching and placeholders properly.
6. Persist in-progress state: the order on the mobile app, the form on the web app, so a
   backgrounded app or a closed tab keeps the work.
7. Replace the mock APIs with real clients, moving request cancellation and retry
   handling into that layer.

## AI tools used, and how I validated the output

I used Claude to generate most of the code in both apps.

What I did with it:

- **Reviewed the validators, the order reducer and both submit flows**, and read Claude's
  explanation of each change. These are the places where a plausible-looking wrong answer
  is most likely and most costly. The ABN checksum is tested with a known valid ABN, the
  same number with two digits transposed, and an 11-digit number that fails the checksum.
- **Tested every flow manually**, in the browser for the web app and on a physical device
  through Expo Go for the mobile app. Component tests say nothing about whether a touch
  target is reachable with a thumb or whether the modal's safe area is right.
- **Checked that the tests catch regressions by introducing deliberate bugs**, some
  myself and some by asking Claude to introduce them, then reviewing which tests failed.
  The bugs included swapping the local date comparison for a UTC one, removing the
  double-submit ref, and letting the reducer add an unavailable product. Each one has a
  test that caught it: the timezone test at 00:30 and 23:30, the three-click submit test,
  and the reducer's unavailable-product test. Generated tests can pass against broken
  code, which makes this check worth the time.

The comments in the code record why a decision was made, because the non-obvious parts,
such as why the double-submit guard is a ref and why the modal needs its own safe-area
provider, are what gets lost otherwise.

Time spent: about 3 hours of build time. The dev environment was set up beforehand.
