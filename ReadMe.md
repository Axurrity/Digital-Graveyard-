Digital Graveyard Collective — prototype

A web-based interactive digital memorial garden, exploring how interaction design
can support reflective, non-performative digital mourning.

PAGES
-`index.html` — landing page + the Garden (scattered photo pins across a
  dark cinematic band; click a pin to visit that memorial)
-`create.html` — create a memorial: name, dates, photo, biography, favourite
  quote, image gallery, memory timeline, favourite ambient sound, private toggle
-`memorial.html` — a memorial: dark "identity band" (photo, name, quote,
  candle/flower gestures) + a tabbed cream body (About / Timeline / Memories
  / Gallery / Reflections)

FILES
-`style.css` — all styling
-`script.js` — all logic (data storage, rendering, audio, Reflection Mode)
-`logo.png` — site mark, used as favicon and in the header
-`assets/audio/` — royalty-free ambient tracks (Pixabay Music, no attribution required)
-`assets/images/` — background photography (Unsplash/Pexels, free for commercial
  use) and flower icon graphics

KEY DESIGN DECISIONS 
There are no, no comment counts, no leaderboards.** The "Memories from others"
panel deliberately has no like/heart icons, informed directly by Navon & Noy
(2022) and Coppola & Mangone (2025) on the performative and social-capital
dynamics of public grief on mainstream platforms.

Two visual registers, applied by context, not decoration**: dark cinematic
bands for viewing/presence (hero, Garden, a memorial's identity block), warm
cream panels for contribution (creating a memorial, leaving a memory, the
tabbed body of a memorial page).

Reflection Mode, a fullscreen, distraction-free, slow-fading slideshow
with a minimal player bar and ambient sound picker. Responding directly to She et al. (2021) and Ueda
et al. (2022) on memorial design supporting quiet reflection over constant
interaction.

Ambient audio is looped royalty-free tracks (HTML5 Audio), not
synthesised.

Data persists in the browser's localStorage not a server — a real
front-end interaction-design prototype, appropriate for evaluating interface
decisions rather than infrastructure.

The "Make private" checkbox is a placeholder. It's visible and
functional as a UI toggle, but does not restrict access as real privacy
requires a backend and user accounts, out of scope for this build. Documented
as a deliberate scope decision in the report,



