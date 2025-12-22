from core.gmail_utils import send_gmail_api_email


def run_test():
    resp = send_gmail_api_email('seyxhel2023@gmail.com', 'View Test Email', 'This is a test sent from scripts/test_gmail_call.py')
    print('Result:', resp)


if __name__ == '__main__':
    run_test()
