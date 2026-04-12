## Bug Report — 2026-04-12T06:40:26.883Z

### Steps to Reproduce
| # | Time | Action | Note |
|---|------|--------|------|
| 1 | 00:04 | click: div ("Announcements") |  |
| 2 | 00:07 | focus: button.MuiButtonBase-root.MuiIconButton-root |  |
| 3 | 00:07 | click: svg[testid=AddIcon] |  |
| 4 | 00:09 | focus: input#title |  |
| 5 | 00:09 | click: input#title |  |
| 6 | 00:13 | input: input#title |  |
| 7 | 00:16 | input: input#title |  |
| 8 | 00:17 | change: input#title |  |
| 9 | 00:17 | blur: input#title |  |
| 10 | 00:43 | focus: input#button_text |  |
| 11 | 00:43 | click: input#button_text |  |
| 12 | 00:45 | input: input#button_text |  |
| 13 | 00:47 | input: input#button_text |  |
| 14 | 00:48 | input: input#button_text |  |
| 15 | 00:50 | change: input#button_text |  |
| 16 | 00:50 | blur: input#button_text |  |
| 17 | 00:50 | focus: input#button_url |  |
| 18 | 00:50 | click: input#button_url |  |
| 19 | 00:54 | input: input#button_url |  |
| 20 | 00:55 | input: input#button_url |  |
| 21 | 00:56 | change: input#button_url |  |
| 22 | 00:56 | blur: input#button_url |  |
| 23 | 00:56 | focus: button[Choose date] |  |
| 24 | 00:56 | click: svg[testid=CalendarIcon] |  |
| 25 | 00:56 | focus: button ("12") |  |
| 26 | 00:58 | click: button ("12") |  |
| 27 | 00:58 | focus: button[Choose date, selected date is Apr 12, 20] |  |
| 28 | 00:58 | select: button ("12") |  |
| 29 | 00:59 | focus: button[Choose date] |  |
| 30 | 00:59 | click: button[Choose date] |  |
| 31 | 00:59 | focus: button ("12") |  |
| 32 | 01:01 | click: button ("12") |  |
| 33 | 01:01 | focus: button[Choose date, selected date is Apr 12, 20] |  |
| 34 | 01:01 | select: button ("12") |  |
| 35 | 01:02 | focus: div#mui-component-select-display_on |  |
| 36 | 01:02 | focus: li ("Investor Portal") |  |
| 37 | 01:02 | click: body |  |
| 38 | 01:04 | focus: li ("Issuer Portal") |  |
| 39 | 01:05 | click: li ("Issuer Portal") |  |
| 40 | 01:05 | focus: div#mui-component-select-display_on |  |
| 41 | 01:05 | select: li ("Issuer Portal") |  |
| 42 | 01:06 | focus: button ("Save") |  |
| 43 | 01:06 | click: button ("Save") |  |
| 44 | 01:06 | focus: input#button_url |  |
| 45 | 01:08 | click: input#button_url |  |
| 46 | 01:12 | input: input#button_url |  |
| 47 | 01:13 | input: input#button_url |  |
| 48 | 01:14 | input: input#button_url |  |
| 49 | 01:14 | input: input#button_url |  |
| 50 | 01:16 | change: input#button_url |  |
| 51 | 01:16 | blur: input#button_url |  |
| 52 | 01:16 | focus: button ("Save") |  |
| 53 | 01:16 | click: svg[testid=SaveIcon] |  |

### Network Requests
| Status | Time | Method | URL |
|--------|------|--------|-----|
| ✅ 200 | 00:07 | GET | https://uat-admin.sdax.co/settings/announcements/new?_rsc=1c9d5 |
| ✅ 204 | 00:07 | POST | https://uat-admin.sdax.co/cdn-cgi/rum? |
| ✅ 200 | 00:07 | GET | https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap |
| ✅ 200 | 00:07 | GET | https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap |
| ✅ 204 | 01:16 | OPTIONS | https://uat-api.sdax.co/v2/setting/admin/announcement |
| ✅ 201 | 01:16 | POST | https://uat-api.sdax.co/v2/setting/admin/announcement |
| ✅ 204 | 01:18 | POST | https://uat-admin.sdax.co/cdn-cgi/rum? |
| ✅ 204 | 01:18 | OPTIONS | https://uat-api.sdax.co/v2/setting/admin/announcement?search=&page=1&pageSize=10&sort_by=&sort_type=&ai_ind=false |
| ✅ 200 | 01:18 | GET | https://uat-api.sdax.co/v2/setting/admin/announcement?search=&page=1&pageSize=10&sort_by=&sort_type=&ai_ind=false |

### Console Errors
- `00:00` TinyMCE is running in evaluation mode. Provide a valid license key or add license_key: 'gpl' to the init config to agree to the open source license terms. Read more at https://www.tiny.cloud/license-key/
- `00:00` TinyMCE is running in evaluation mode. Provide a valid license key or add license_key: 'gpl' to the init config to agree to the open source license terms. Read more at https://www.tiny.cloud/license-key/
- `00:07` TinyMCE is running in evaluation mode. Provide a valid license key or add license_key: 'gpl' to the init config to agree to the open source license terms. Read more at https://www.tiny.cloud/license-key/
- `00:07` TinyMCE is running in evaluation mode. Provide a valid license key or add license_key: 'gpl' to the init config to agree to the open source license terms. Read more at https://www.tiny.cloud/license-key/
