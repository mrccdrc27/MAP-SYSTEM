---
title: Depreciation Engine
sidebar_label: Depreciation
---

import Alert from '@theme/Admonition';

# Depreciation Engine

The AMS uses the **Straight-Line Method**.

<Alert type="warning">
  Depreciation runs nightly via Celery tasks. Do not trigger manually in production.
</Alert>

## Formula
$$
\text{Depreciation} = \frac{\text{Cost} - \text{Salvage Value}}{\text{Useful Life}}
$$

