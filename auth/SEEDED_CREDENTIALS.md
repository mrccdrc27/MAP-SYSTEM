# Seeded Credentials

This document lists the user credentials created by the various seeding scripts in the Auth service.

## Default Superuser
*Created by `auth/users/management/commands/create_default_admin.py`*

| Role | Email | Password |
|---|---|---|
| Superuser | `admin@example.com` | `adminpassword` |

## System Admins
*Created by `auth/systems/management/commands/seed_systems.py`*

| System | Role | Email | Password |
|---|---|---|---|
| HDTS | Admin | `adminhdts@example.com` | `admin` |
| TTS | Admin | `admintts@example.com` | `admin` |
| AMS | Admin | `adminams@example.com` | `admin` |
| BMS | Admin | `adminbms@example.com` | `admin` |

## HDTS Users
*Created by `auth/hdts/management/commands/seed_hdts.py`*

| Role | Name | Email | Password | Username |
|---|---|---|---|---|
| Ticket Coordinator | Alex Johnson | `alex.johnson@gmail.com` | `password123` | `alexj` |
| Ticket Coordinator | Maria Garcia | `maria.garcia@gmail.com` | `password123` | `mariag` |
| Admin | David Lee | `david.lee@gmail.com` | `password123` | `davidl` |
| Ticket Coordinator | Sarah Chen | `sarah.chen@gmail.com` | `password123` | `sarahc` |
| Ticket Coordinator | Chris Wilson | `chris.wilson@gmail.com` | `password123` | `chrisw` |

## HDTS Employees
*Created by `auth/hdts/management/commands/seed_employees.py`*

| Role | Name | Email | Password | Username |
|---|---|---|---|---|
| Employee | John Doe | `john.doe@gmail.com` | `TestPassword123!` | `johndoe` |
| Employee | Jane Smith | `jane.smith@gmail.com` | `TestPassword123!` | `janesmith` |
| Employee | Robert Johnson | `robert.johnson@gmail.com` | `TestPassword123!` | `robertj` |
| Employee | Sarah Williams | `sarah.williams@gmail.com` | `TestPassword123!` | `sarahw` |
| Employee | Michael Brown | `michael.brown@gmail.com` | `TestPassword123!` | `michaelb` |
| Employee | Emily Davis | `emily.davis@gmail.com` | `TestPassword123!` | `emilyd` |
| Employee | David Miller | `david.miller@gmail.com` | `TestPassword123!` | `davidm` |
| Employee | Lisa Anderson | `lisa.anderson@gmail.com` | `TestPassword123!` | `lisaa` |

## TTS Users
*Created by `auth/tts/management/commands/seed_tts.py`*

| Role | Name | Email | Password |
|---|---|---|---|
| Admin | Lawrence Afable | `tickettrackingsystem.mapactive+lawrenceafable@dev.mapactive.tech` | `Tr@ck1ng.Sys7em.2025!Secure` |
| Asset Manager | Rivo Vebayo | `tickettrackingsystem.mapactive+rivovebayo@dev.mapactive.tech` | `Tr@ck1ng.Sys7em.2025!Secure` |
| Admin | Marc Cedric Mayuga | `tickettrackingsystem.mapactive+marccedric@dev.mapactive.tech` | `Tr@ck1ng.Sys7em.2025!Secure` |
| Budget Manager | Sean Axzel Valderama | `tickettrackingsystem.mapactive+seanvalderama@dev.mapactive.tech` | `Tr@ck1ng.Sys7em.2025!Secure` |

## AMS Users
*Created by `auth/systems/management/commands/seed_ams.py`*

### Production-style
| Role | Name | Email | Password |
|---|---|---|---|
| Admin | Asset Administrator | `ams.admin@example.com` | `AmsAdmin@2025!Secure` |
| Operator | Asset Operator | `ams.operator@example.com` | `AmsOperator@2025!Secure` |

### Test Users
| Role | Name | Email | Password |
|---|---|---|---|
| Admin | AMS Admin | `amsadmin@test.local` | `amsadmin123` |
| Operator | AMS Operator | `amsoperator@test.local` | `amsoperator123` |

## BMS Users
*Created by `auth/systems/management/commands/seed_bms.py`*

### Production-style
| Role | Name | Email | Password |
|---|---|---|---|
| ADMIN | Budget Administrator | `bms.admin@example.com` | `BmsAdmin@2025!Secure` |
| FINANCE_HEAD | Finance Head | `finance.head@example.com` | `FinanceHead@2025!Secure` |
| GENERAL_USER | General User | `general.user@example.com` | `GeneralUser@2025!Secure` |

### Test Users
| Role | Name | Email | Password |
|---|---|---|---|
| ADMIN | Test Admin | `testadmin@bms.local` | `testadmin123` |
| FINANCE_HEAD | Test Finance | `testfinance@bms.local` | `testfinance123` |
| GENERAL_USER | Test User | `testuser@bms.local` | `testuser123` |
