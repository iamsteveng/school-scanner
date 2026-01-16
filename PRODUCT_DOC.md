# School Open Day Radar

## Product positioning
- **Target users:** Hong Kong parents focused on local curriculum schools who need to monitor Open Day / Information Day announcements for both primary and secondary schools while juggling busy schedules.
- **Problem:** Each school releases updates unpredictably across disparate channels—primarily individual school websites—creating overwhelming manual tracking work and a constant fear of missing critical enrollment windows.
- **Solution:** School Scanner autonomously crawls every local school source on a daily cadence (with a guaranteed sweep every few days to cover week-long registration windows), normalizes the details, and displays the latest actionable information in a single web app.
- **Value promise:** Parents receive timely, trustworthy updates without repeatedly visiting dozens of websites, ensuring they never miss registration opportunities or key deadlines.
- **Differentiation:** Coverage spans both primary and secondary schools, uses AI-assisted crawling (OpenAI Codex CLI) for rapid adaptation, and includes proactive alerts plus planning tools tailored to Hong Kong's education landscape.

## MVP Product Specification (Responsive Web App)

---

## 1. Product Overview

**School Open Day Radar** helps Hong Kong parents monitor Open Day / Information Day announcements from local curriculum primary and secondary schools without constant manual checking.

The product automatically monitors official school websites and delivers **WhatsApp update summaries** based on subscription tier.

---

## 2. Target Users

* Hong Kong parents with children in:

  * K2–K3 (Primary school preparation)
  * P3–P5 (Secondary school preparation)
* Focus on:

  * Aided schools
  * DSS schools
  * Government schools
* Parents with limited time and high sensitivity to missed admission windows

---

## 3. Core Value Proposition

> **Free users**: Manually check dashboard + receive weekly WhatsApp summary
> **Premium users**: Peace of mind with daily WhatsApp summaries and full control

---

## 4. Registration & WhatsApp Verification

### 4.1 Registration Entry Point

**Route:** `/start`

User must register using a **WhatsApp number**.

UI elements:

* Country code selector (default: +852)
* WhatsApp number input
* Terms & Privacy checkbox
* CTA: **「發送 WhatsApp 驗證連結」**

Microcopy:

> 我哋會用 WhatsApp 發一條驗證連結俾你，唔會發垃圾訊息。

---

### 4.2 WhatsApp Verification Message

User receives a **verification link** via WhatsApp.

Message example:

```
你好！  
請按以下連結完成驗證並開始設定 School Open Day Radar：  
https://yourdomain.com/v/XXXX
```

---

### 4.3 Verification Link Handling

**Route:** `/v/:token`

On link click:

1. Validate token (single-use, expires in 10 minutes)
2. Mark WhatsApp number as verified
3. Create authenticated session
4. Redirect user:

   * New user → `/schools`
   * Existing user → `/dashboard`

The verified WhatsApp number is now ready to receive update summaries.

---

## 5. School Search & Selection (Combined Screen)

### 5.1 Screen: School Search & Selection

**Route:** `/schools`

This screen combines onboarding + school selection.

#### UI Components

**Search**

* Search bar (Chinese / English school names)

**Filters (collapsible)**

* School level:

  * Primary
  * Secondary
* School type:

  * Aided
  * DSS
  * Government
* District:

  * Multi-select (HK districts)

**School List**

* School name
* District
* Tags (Aided / DSS / Government)
* Checkbox

**Selection Counter**

> 已選 X / 5 間學校（免費）

**CTA**

* Button: **「開始監察」**

Expectation copy:

> 免費帳戶每星期收到一次 WhatsApp 更新摘要
> Premium 可每日接收 + 隨時修改學校名單

---

## 6. Dashboard

### 6.1 Screen: Dashboard

**Route:** `/dashboard`

---

### Section A: Monitoring Status

```
📡 監察中
已追蹤：5 間學校
最後檢查：X 分鐘前
```

Button:

* 🔒 編輯學校名單

---

### Section B: Latest Updates Feed

Chronological list showing:

* 🟢 New announcement
* 🟡 Updated info
* 🔘 No recent updates

Free and Premium users see the same feed **only when logged in**.

---

### Section C: “Since You Last Checked”

Example:

> 自你上次查看後，你追蹤的學校有 2 則新更新
> 另外有 7 間你未追蹤的學校亦有新消息

This section exists to:

* Reinforce value
* Create premium upgrade motivation

---

## 7. Edit School Selection Rules

| Account Type | Can Edit School List |
| ------------ | -------------------- |
| Free         | ❌ No                 |
| Premium      | ✅ Yes                |

---

### Free User Taps “Edit”

Modal copy:

```
🔒 修改學校名單

免費帳戶在訂閱後無法更改學校名單，
以確保監察準確。

升級 Premium 即可：
✓ 隨時新增 / 移除學校
✓ 每日 WhatsApp 更新摘要
```

Buttons:

* 稍後再說
* 升級 Premium

---

## 8. Notifications & WhatsApp Summary

### 8.1 Free Account

* WhatsApp summary: **once per week**
* No instant notifications
* No daily summary

#### Weekly WhatsApp Message Example

```
📚 本週學校更新摘要

你追蹤的 5 間學校中：
• 有 3 則更新

⚠️ Since you last checked：
另外有 12 間你未追蹤的學校
在本週亦有 Open Day / 入學資訊更新

升級 Premium 即可每日接收完整摘要，
並隨時修改學校名單。
```

> Note: Missed schools are **not named**.

---

### 8.2 Premium Account

* WhatsApp summary: **once per day**
* Same format, higher frequency

#### Daily WhatsApp Message Example

```
📚 學校更新摘要（1月16日）

🟢 聖若瑟書院
- 公布 Open Day：2月18日
- 需網上登記

🟡 英皇書院
- 入學簡介會時間更新

🔘 其餘學校
- 暫無新消息
```

---

## 9. Premium Subscription & Payment

### 9.1 Pricing

* **HK$39 / month**
* Subscription-based
* No free trial (MVP)

---

### 9.2 Upgrade Page

**Route:** `/upgrade`

Content:

* Plan name: Premium
* Price: HK$39 / 月
* Benefits:

  * 每日 WhatsApp 更新摘要
  * 可隨時修改學校名單
  * 完整更新紀錄
* CTA: **「用信用卡付款（Stripe）」**

Trust copy:

> 付款由 Stripe 處理，我哋唔會儲存信用卡資料

---

### 9.3 Stripe Integration (MVP)

Use **Stripe Checkout** (hosted).

Flow:

1. User clicks upgrade CTA
2. Redirect to Stripe Checkout
3. On success → `/billing/success`
4. On cancel → `/billing/cancel`

---

### 9.4 Required Stripe Webhooks

* `checkout.session.completed`
* `invoice.payment_succeeded`
* `invoice.payment_failed`
* `customer.subscription.deleted`

---

### 9.5 Billing Success Page

**Route:** `/billing/success`

Content:

* ✅ 已成功升級 Premium
* 你將由明天開始收到每日 WhatsApp 更新摘要
* Button: 返回 Dashboard

---

## 10. Account States

| State     | Description              |
| --------- | ------------------------ |
| Free      | Weekly WhatsApp, no edit |
| Premium   | Daily WhatsApp, editable |
| Past Due  | Grace period             |
| Cancelled | Downgrade to Free        |

---

## 11. Success Metrics

### 11.1 Activation Rate

**Definition (recommended):**

> User selects ≥1 school and reaches dashboard with monitoring enabled within 24 hours of signup.

Formula:

```
Activation Rate = Activated Users / Signed-up Users
```

Tracked events:

* `signup_completed`
* `wa_verified`
* `school_selection_saved`
* `dashboard_first_view`

---

### 11.2 Premium Conversion Rate

**30-day conversion**

```
Premium Conversion Rate =
Premium Subscribers (within 30 days) / Signed-up Users
```

Funnel tracking:

* `upgrade_cta_clicked` (source)
* `checkout_started`
* `checkout_completed`
* `subscription_active`

---

### 11.3 Additional Diagnostic Metric

**Edit Intent Rate**

```
Edit Intent Rate =
Free users who click “Edit” / Active free users
```

This measures premium upgrade pressure.

---

## 12. Explicit MVP Exclusions

The following are **out of scope** for MVP:

* Instant alerts
* Calendar sync
* Parent forums
* Admission probability scoring
* AI recommendations
* School comparison tables

---

## 13. MVP Principle

> The MVP is not about speed of alerts.
> It is about **reducing parents’ mental load**.
