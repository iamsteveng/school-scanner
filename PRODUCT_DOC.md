# School Scanner

## Product positioning
- **Target users:** Hong Kong parents who need to monitor Open Day / Information Day announcements for both primary and secondary schools while juggling busy schedules.
- **Problem:** Each school releases updates unpredictably across disparate channels, creating overwhelming manual tracking work and a constant fear of missing critical enrollment windows.
- **Solution:** School Scanner autonomously crawls every local school source on a daily cadence, normalizes the details, and displays the latest actionable information in a single web app.
- **Value promise:** Parents receive timely, trustworthy updates without repeatedly visiting dozens of websites, ensuring they never miss registration opportunities or key deadlines.
- **Differentiation:** Coverage spans both primary and secondary schools, uses AI-assisted crawling (OpenAI Codex CLI) for rapid adaptation, and includes proactive alerts plus planning tools tailored to Hong Kong's education landscape.

## Complete list of functions
1. **Daily school scan:** Automatically visits each supported school source with OpenAI Codex CLI and records newly posted Open Day / Information Day notices.
2. **Event normalization:** Parses announcement text and structures key metadata such as dates, registration requirements, quotas, and contact channels for consistent downstream display.
3. **Search and filters:** Supports keyword search plus filters by district, curriculum, language of instruction, grade level, and event type to narrow the overwhelming list of options.
4. **Flexible subscriptions:** Parents choose between receiving updates for every primary school, every secondary school, or a custom set of schools so notifications stay relevant without extra configuration.
5. **Admin monitoring:** Internal console monitors crawler health, missing data, and high-latency sources so the team can intervene before parents notice gaps.
