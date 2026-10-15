---
layout: page
title: How we count cameras
permalink: /data/
description: Where NitoPath's license plate camera data comes from, how often it refreshes, how the numbers on this site are counted, and what they can't tell you.
lead: Where the camera data comes from, how often it changes, and what the numbers can and can't tell you.
---
{% assign cov = site.data.coverage %}
## The short version

- **{{ cov.total_text }}** automated license plate readers (ALPRs) are mapped in the US as of {{ cov.updated | date: "%B %-d, %Y" }}, across {{ cov.states }} states.
- They come from [OpenStreetMap](https://www.openstreetmap.org/copyright), where volunteers map them by hand, many through the [DeFlock](https://deflock.org/) project.
- Every figure on this website comes from one file that is recounted once a day. The app refreshes each area it shows every few hours.
- These are the cameras **known so far**, so treat every count as a minimum.

## Where the data comes from

A camera is counted when it is tagged in OpenStreetMap as a surveillance camera of type ALPR ([`surveillance:type=ALPR`](https://wiki.openstreetmap.org/wiki/Tag:surveillance:type%3DALPR)). NitoPath keeps its own copy and refreshes each area from OpenStreetMap every few hours, and more often for areas people are looking at in the app. Cameras removed from OpenStreetMap are removed from NitoPath as well, but only when the main OpenStreetMap data server confirms it, so a lagging mirror can't make cameras disappear.

Many entries also record who operates the camera, the manufacturer, which way it faces and what it is mounted on. Those details show when you tap a camera in the app, and they power the "who runs them" list in the [cameras near you]({{ '/#near' | relative_url }}) search.

## How the numbers on this site are counted

- **The 3D map and the state pages** group cameras into half-degree squares, about 35 by 30 miles. Each column is one square, and its height and colour show how many cameras are in it. A square counts toward the state its centre sits in, so a few cameras near a border can be credited to the neighbouring state.
- **"Busiest areas"** on a state page are those squares, named after the county at their centre. A square can reach into nearby counties.
- **"Cameras near you"** is a live count of every mapped camera within 10 miles of the place you search, straight from NitoPath's database. If that area hasn't been refreshed recently, it is refreshed from OpenStreetMap first.
- **Route counts** in the app count the mapped cameras within a short distance of the route line (you can change that distance in the app's settings).

The site's totals are rebuilt each day by a script in the [website's public repository](https://github.com/Bearsywearsy/nitopath-legal/blob/main/scripts/build-coverage.mjs), so you can check exactly how they are made.

## What the numbers can't tell you

- **They are incomplete.** A state or town with few mapped cameras may have few volunteers rather than few cameras. A route with no known cameras can still pass ones nobody has mapped.
- **They can be out of date.** Cameras get moved, removed or added before anyone updates the map.
- **They don't say what is recorded or kept.** Data retention and sharing rules are set by each operator and local government. Our [explainer on license plate readers](/alpr/) shows how to look up your local policy.

## Using and citing this data

Camera locations are © OpenStreetMap contributors and available under the [Open Database License](https://www.openstreetmap.org/copyright). If you quote a NitoPath figure, please say it counts cameras mapped in OpenStreetMap as of the date shown and link to this page. For press questions, contact [{{ site.contact_email }}](mailto:{{ site.contact_email }}).

Found a camera that's missing? Report it from the NitoPath app, or add it at [deflock.org/report](https://deflock.org/report).
