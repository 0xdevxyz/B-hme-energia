# Client Onboarding Template

Use this as a checklist for every new client.

## Pre-Sales
- [ ] Identify primary keyword: "[industry] [city]"
- [ ] Check Google search volume (Google Keyword Planner or Ubersuggest)
- [ ] Check competitor websites for the keyword
- [ ] Confirm domain availability or existing domain

## Setup
- [ ] `studio create [clientname]`
- [ ] Fill config.json with client data
- [ ] Confirm NAP data: Name, Address, Phone (must be exact)
- [ ] Confirm editorEmail (client's email for Magic Link)
- [ ] `studio generate [clientname]`
- [ ] Review generated index.html in browser
- [ ] Set up .env (SMTP, deploy config)

## Deployment
- [ ] `studio deploy [clientname]`
- [ ] Test Magic Link: visit domain/?edit
- [ ] Send test edit (change one text, verify save)
- [ ] Test image upload
- [ ] Verify llms.txt is accessible at domain/llms.txt
- [ ] Verify robots.txt at domain/robots.txt
- [ ] Verify sitemap.xml at domain/sitemap.xml
- [ ] Submit sitemap to Google Search Console

## Client Handover
- [ ] Send login instructions (how to use /?edit)
- [ ] Send reputation-checklist.md
- [ ] Explain what they can/cannot edit
- [ ] Set up monthly update reminder

## Post-Launch (Week 1-4)
- [ ] Add 1-2 landing pages for district/service keywords
- [ ] Verify Google Business Profile is live
- [ ] Check that NAP is consistent across directories
- [ ] First ranking check after 4 weeks
