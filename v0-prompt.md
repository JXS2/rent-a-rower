# v0 Prompt: Michigan Men's Rowing - Rent-a-Rower Booking Portal

Create a beautiful, modern customer-facing booking portal for Michigan Men's Rowing's "Rent-a-Rower" service where customers can reserve team members for yard work, moving help, or any labor they need.

## Design Requirements

### Brand & Style
- **University Theme**: Incorporate Michigan Men's Rowing branding with sophisticated blue/maize color scheme
- **Athletic/Premium Feel**: The service costs $100 per rower for 4 hours of work - design should feel premium and professional
- **Trust & Credibility**: This is a university rowing team fundraiser - design should convey trustworthiness and athleticism
- **Modern & Clean**: Use contemporary design patterns with plenty of white space

### Page Layout

**Hero Section:**
- Eye-catching header with Michigan Men's Rowing branding
- Clear value proposition: "Reserve team members for 4 hours of yard work, moving help, or any labor you need. $100 per rower."
- Consider adding a hero image or illustration showing rowing team members at work (use placeholder if needed)
- Subtle athletic/rowing-themed design elements

**Date Selection Section:**
- Card-based grid layout (responsive: 1 column mobile, 2 columns tablet/desktop)
- Each date card should be clickable and show clear selected state
- Display dates in human-readable format (e.g., "Saturday, March 15, 2025")
- Visual feedback on hover and selection
- Empty state message: "No dates currently available — check back soon!"
- Loading state with skeleton loaders

**Booking Form Section:**
- Only appears after date selection
- Clean, well-organized form with clear labels
- Fields:
  - Customer name (text input)
  - Email (email input)
  - Phone (tel input)
  - Address (text input with subtle helper text: "Full address where work will be performed")
  - Number of rowers (dropdown: 1-8, showing price calculation)
  - Payment method (radio buttons: "Pay by Cash/Check" selected by default, "Pay Online (Credit/Debit Card) - Coming Soon" disabled)
- Real-time price calculation display prominently
- Large, prominent "Complete Booking" button
- Error message display area (red alert style)
- Success/loading states

### Visual Design Elements

**Color Palette:**
- Primary: Michigan Blue (#00274C or similar deep blue)
- Accent: Maize/Gold (#FFCB05 or similar warm yellow) - use sparingly
- Neutrals: Slate grays for text, off-white backgrounds
- Success: Green for confirmations
- Error: Red for error states

**Typography:**
- Clean, professional sans-serif font (Inter, Public Sans, or similar)
- Clear hierarchy: large headings, readable body text
- Bold weights for emphasis

**Components:**
- Rounded corners (8px-12px) for modern feel
- Subtle shadows for depth
- Smooth transitions and hover effects
- Input fields with focus states (ring effect)
- Cards with border or subtle shadow
- Icons where appropriate (calendar for dates, users for rowers, etc.)

**Spacing & Layout:**
- Maximum width container (max-w-4xl or max-w-5xl)
- Generous padding and margins
- Mobile-first responsive design
- 8px spacing system

### Interactive States

1. **Date Cards:**
   - Default: Light background, border, subtle shadow
   - Hover: Darker border, slight scale or shadow increase
   - Selected: Blue background or blue border, checkmark icon

2. **Form Inputs:**
   - Default: Light border
   - Focus: Blue ring, darker border
   - Error: Red border, red ring
   - Disabled: Gray background, gray text

3. **Buttons:**
   - Default: Blue background, white text
   - Hover: Darker blue, subtle lift
   - Disabled: Gray background, not clickable
   - Loading: Show spinner, "Processing..." text

### Accessibility
- ARIA labels where needed
- Keyboard navigation support
- High contrast ratios
- Focus indicators
- Semantic HTML

### Responsive Behavior
- Mobile (< 768px): Single column, stacked layout, full-width cards
- Tablet (768px - 1024px): 2-column date grid
- Desktop (> 1024px): 2-column date grid, optimal form width

## Current Functionality to Preserve

The component must maintain these behaviors:
- Fetch available dates from `/api/dates/available` on mount
- Handle date selection (store in state)
- Form submission posts to `/api/bookings` with:
  ```json
  {
    "name": "string",
    "email": "string",
    "phone": "string",
    "address": "string",
    "num_rowers": number,
    "payment_method": "cash_check" | "stripe",
    "date_id": "string"
  }
  ```
- On success with cash/check: redirect to `/confirmation?booking_id={id}`
- On success with stripe: redirect to `data.checkout_url`
- Handle loading states during fetch and submission
- Handle errors with user-friendly messages

## Additional Polish Ideas

- Add a FAQ section or info box: "What kind of work can rowers do?" / "How does payment work?"
- Include social proof: "Over 500 hours of community service provided" or similar stat
- Add a subtle pattern or texture to background
- Consider a sticky header as user scrolls
- Microinteractions: confetti on successful booking, smooth scroll to form
- Price breakdown tooltip or info icon
- Progress indicator if form feels long

## Technical Stack
- React with TypeScript
- Tailwind CSS for styling
- Modern, accessible component patterns
- No external UI libraries needed (pure Tailwind + custom components)

Generate a beautiful, conversion-optimized booking page that makes customers excited to book Michigan Men's Rowing team members!
