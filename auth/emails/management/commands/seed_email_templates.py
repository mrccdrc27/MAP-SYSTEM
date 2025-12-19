# No seed commands needed - using pure template files from auth/emails/templates/emails/
    help = 'Seed email templates into the database'

    def handle(self, *args, **options):
        templates = [
            {
                'name': 'password_reset',
                'description': 'Password reset email with reset link',
                'subject': 'Password Reset Request - Ticket Tracking System',
                'html_file': 'emails/password_reset.html',
            },
            {
                'name': 'otp',
                'description': 'OTP verification code email',
                'subject': 'Your Verification Code - {{ otp_code }}',
                'html_file': 'emails/otp.html',
            },
            {
                'name': 'account_locked',
                'description': 'Account locked notification',
                'subject': 'Security Alert: Your Account Has Been Locked',
                'html_file': 'emails/account_locked.html',
            },
            {
                'name': 'account_unlocked',
                'description': 'Account unlocked notification',
                'subject': 'Your Account Has Been Unlocked',
                'html_file': 'emails/account_unlocked.html',
            },
            {
                'name': 'failed_login',
                'description': 'Failed login attempt notification',
                'subject': 'Security Alert: Failed Login Attempt',
                'html_file': 'emails/failed_login.html',
            },
        ]

        for template_data in templates:
            try:
                # Read the HTML file
                template_path = os.path.join('emails', 'templates', template_data['html_file'])
                with open(template_path, 'r') as f:
                    html_content = f.read()

                # Create or update the template
                template, created = EmailTemplate.objects.update_or_create(
                    name=template_data['name'],
                    defaults={
                        'description': template_data['description'],
                        'subject': template_data['subject'],
                        'html_content': html_content,
                        'is_active': True,
                    }
                )

                action = 'Created' if created else 'Updated'
                self.stdout.write(
                    self.style.SUCCESS(f'{action} email template: {template.name}')
                )

            except FileNotFoundError:
                self.stdout.write(
                    self.style.ERROR(f'Template file not found: {template_data["html_file"]}')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error processing {template_data["name"]}: {str(e)}')
                )

        self.stdout.write(self.style.SUCCESS('\nEmail templates seeded successfully!'))
