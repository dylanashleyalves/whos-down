# Google Play: store listing and App content answers

Everything to paste into Play Console for step 1. Images are in this folder:

| File | Where it goes | Size |
| --- | --- | --- |
| `icon-512.png` | Store listing → App icon | 512 × 512 |
| `feature-graphic.png` | Store listing → Feature graphic | 1024 × 500 |
| `screenshots/1-intro.png` … `5-profile.png` | Store listing → Phone screenshots | 1080 × 2160 |

To remake the feature graphic, edit `feature-graphic.html` and render it again (command at the top of that file).

---

## 1. Create the app

Play Console → **Create app**

- **App name:** Who's Down
- **Default language:** English (United Kingdom) — or English (United States), your choice
- **App or game:** App
- **Free or paid:** Free (this can't be changed to paid later)
- Tick the two declarations (developer program policies, US export laws).

---

## 2. Store listing

Grow → Store presence → **Main store listing**

**App name** (30 max)

```
Who's Down
```

**Short description** (80 max — this one is exactly 80)

```
Find people nearby for sports, gym, gaming, food and hangouts, and just show up.
```

**Full description** (4000 max)

```
Want to play basketball tonight but your friends are busy? Looking for a gym buddy, a fifth for ranked, or someone to grab supper with? Who's Down helps you meet people nearby by doing things together. No swiping, no awkward small talk, just plans.

HOW IT WORKS
• Post what you're down for: pickup games, gym sessions, gaming nights, food runs, hikes or hangouts. Pick a time, a place and how many people you need.
• Join activities near you with one tap, then sort out the details in the group chat.
• Meet up. Afterwards, tap "Hang again?" on the people you clicked with. If they pick you too, they join your crew.
• Message your crew any time, and see when they're free.

MADE FOR MEETING NEW PEOPLE
• Post ideas and a "How to find us" note make hosting easy, even if it's your first time.
• First-timers get a badge, so others know to say hi.
• Set your status (Free now, Free tonight, Busy today) and your crew gets a heads-up when you're free.
• Earn XP and ranks for showing up, and give kudos to people who made the meetup great.
• Guys-only and girls-only activities when you'd feel more comfortable.

SAFETY FIRST
• Everyone is 18 or over and agrees to the community guidelines.
• You only see activities in your own country.
• Direct messages and socials unlock only after you've met and both chose to hang again.
• Report or block anyone, any time. Bios can't contain phone numbers or handles.
• Delete your account and everything in it from Settings whenever you like.

No ads. We don't sell your data.

Who's down?
```

**Graphics:** upload the files from the table at the top. Phone screenshots: upload all five in order.

**Category** (Store settings → App category)

- **App or game:** App
- **Category:** Social
- **Tags:** pick the closest ones offered, such as "Social networking", "Meetups", "Sports".

**Store listing contact details** (Store settings)

- **Email:** dylanashleyalves@gmail.com
- **Website:** https://dylanashleyalves.github.io/whos-down/
- **Phone:** leave empty

**Countries** (Production / testing track → Countries / regions): start with **Singapore** only. The app shows activities by country, so launching where people already are matters more than reach.

---

## 3. App content

Policy → **App content**. Each card below is one section there.

### Privacy policy

```
https://dylanashleyalves.github.io/whos-down/privacy.html
```

### Ads

**No**, my app does not contain ads.

### App access

**All or some functionality is restricted.** Add one set of instructions:

- **Name:** Test account
- **Username:** an email-and-password account you create for Google's reviewers (not your own account, and not Google sign-in, which reviewers can't use). Finish profile setup on it first, with an adult birthday.
- **Password:** that account's password
- **Other information:**

  ```
  Sign in with email and password on the first screen (not "Continue with Google"). The account's profile is already set up. Messaging and socials only unlock between people who met at an activity and both chose "Hang again?", so they won't be available on this account.
  ```

### Content rating

Start the questionnaire. **Category:** Social (or "Social networking, forums, blogs and user-generated content", depending on the wording).

Answer honestly. For this app:

- Violence, sexual content, profanity, drugs, gambling, horror: **No** (the app itself contains none; users are forbidden from posting them).
- **Users can interact or exchange content:** Yes (group chats, direct messages, profiles).
- **Shares the user's current location with other users:** No (the app never reads the phone's location; people type where an activity is).
- **Digital purchases:** No.

The rating is calculated from your answers. Apps where strangers chat often get a teen or mature rating, and that's fine.

### Target audience and content

- **Target age:** 18 and over only.
- **Could the store listing unintentionally appeal to children?** No.

### News apps

No.

### Data safety

**Overview**

- Does your app collect or share any of the required user data types? **Yes**
- Is all of the user data collected by your app encrypted in transit? **Yes**
- Which of the following methods of account creation does your app support? **Username and password**, and **OAuth** (Sign in with Google)
- Delete account URL:

  ```
  https://dylanashleyalves.github.io/whos-down/privacy.html#delete
  ```

- Can users request that some of their data is deleted without deleting their account? **Yes** (they can edit or remove their profile, photo, socials, posts and status in the app)

**Data types.** Mark each as **Collected**, **not Shared**. Services that only process data for you (Supabase, Expo, Google, Resend, komoot) don't count as sharing. None of it is processed ephemerally.

| Data type | Required or optional | Purposes |
| --- | --- | --- |
| Location → **Approximate location** (the country and city people type in) | Required | App functionality |
| Personal info → **Name** (display name) | Required | App functionality, Account management |
| Personal info → **Email address** | Required | Account management |
| Personal info → **User IDs** | Required | App functionality, Account management |
| Personal info → **Other info** (date of birth, gender, bio, socials) | Required | App functionality, Fraud prevention, security and compliance |
| Photos and videos → **Photos** (profile photo) | Optional | App functionality |
| Messages → **Other in-app messages** (group chats, direct messages) | Optional | App functionality |
| App activity → **App interactions** (activities joined, check-ins, Hang again, kudos, last opened) | Required | App functionality |
| App activity → **Other user-generated content** (activities, reports, feedback) | Optional | App functionality, Fraud prevention, security and compliance |
| Device or other IDs → **Device or other IDs** (push notification token) | Optional | App functionality |

Everything else (financial info, health, contacts, calendar, audio, files, web browsing, precise location, crash logs, diagnostics, advertising ID): **not collected**.

### Government apps

No.

### Financial features

My app doesn't provide any financial features.

### Health

My app doesn't have any health features.

### Advertising ID

**No**, the app doesn't use an advertising ID. If Play Console warns that your build includes the advertising ID permission, tell Claude and it will be removed in the app's config.
