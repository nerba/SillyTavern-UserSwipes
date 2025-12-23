# SillyTavern - User Swipes

Enable swiping on user messages (last or second to last message in chat).

---

## about the fork

**[24/12/2025]** merry crisis eve

- ST's latest staging broke userswipes for me (on docker)
- so ~~i, me, the user~~ claude yoinked some stuff from [MFC/more flexible continues](https://github.com/LenAnderson/SillyTavern-MoreFlexibleContinues/) (since it survived staging updates!)
- the fix is coded by claude ('vibecode' feels like the wrong term when all i do is paste back console logs)
- idk how long this fix will be compatible with staging. hopefully for a few months...
- this could have been a PR but it's... fully ai-coded and i think it might have changed too muhc stuff?? and idk enough about pr etiquette regarding these things

**known bugs:**
- sometimes it removes swipe navigation buttons (? why? T_T) from character messages. i have no idea why or how to reproduce it. maybe it's just a slow browser thing. it doesn't annoy me often enough (for now) so i just sigh and reload the page
- hide character message -> swipe right -> edit message (or not) -> unhide: results in st's native swipe counter 'freezing' visually. it's visually confusing, but just swipe on the message (with ST's native swipe btns) and the counter will update
   - if you're at the newest/latest swipe and then you swipe right, obviously ST will try to generate a message (this phrasing is incorrect, but i hope you get the gist), so if i just want to update the counter i usually swipe left
