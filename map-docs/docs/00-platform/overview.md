---
title: Platform Overview
sidebar_label: Overview
sidebar_position: 1
---

# MAP Industry Platform

The **MAP Industry Platform** is a microservices-based enterprise system designed to manage assets, budgets, tickets, and help desk operations for organizations.

## Core Systems

| System | Description | Port |
|--------|-------------|------|
| **Auth** | Centralized Identity Provider (IdP) for all systems | 8000 |
| **AMS** | Asset Management System - tracks assets, depreciation, check-in/out | 8001 |
| **BMS** | Budget Management System - proposals, variance reports | 8002 |
| **TTS** | Ticket Tracking System - workflow engine, SLA management | 8003 |
| **HDTS** | Help Desk Ticket System - email parsing, employee ticket submission | 8004 |

## Design Principles

### 1. Hub-and-Spoke Authentication
All systems authenticate through the centralized **Auth Service** using JWT tokens stored in HTTP-only cookies.

### 2. Event-Driven Architecture
Systems communicate asynchronously via **RabbitMQ** for decoupled, scalable operations.

### 3. Independent Deployability
Each system has its own database, allowing independent scaling and deployment.

### 4. Unified User Experience
Single Sign-On (SSO) allows users to seamlessly navigate between systems without re-authentication.

## Quick Links

- [Architecture Diagram](./architecture) - Visual system topology
- [Authentication Flow](./authentication-flow) - How users authenticate
- [Event Bus](./event-bus) - Inter-service messaging
- [Installation Guide](./installation) - Setup instructions
