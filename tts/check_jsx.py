import re

def check_tags(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Simple regex for opening and closing tags we care about
    # We ignore self-closing tags like <div /> or <BarChart />
    tags = re.findall(r'<(div|table|tbody|thead|tr|td|span|h2|p|small)|</(div|table|tbody|thead|tr|td|span|h2|p|small)>', content)
    
    stack = []
    for m in re.finditer(r'<(div|table|tbody|thead|tr|td|span|h2|p|small)|</(div|table|tbody|thead|tr|td|span|h2|p|small)>', content):
        open_tag, close_tag = m.groups()
        if open_tag:
            # Check if it's self-closing
            # We look ahead for />
            tag_start = m.start()
            tag_end_pos = content.find('>', tag_start)
            if content[tag_end_pos-1] == '/':
                # Self closing, ignore
                continue
            stack.append((open_tag, content.count('\n', 0, m.start()) + 1))
        elif close_tag:
            if not stack:
                print(f"Error: Found closing tag </{close_tag}> at line {content.count('\n', 0, m.start()) + 1} but stack is empty")
                return
            last, line = stack.pop()
            if last != close_tag:
                print(f"Error: Mismatched tags at line {content.count('\n', 0, m.start()) + 1}. Expected </{last}> (opened at line {line}) but found </{close_tag}>")
                return
    
    if stack:
        print(f"Error: Unclosed tags remaining: {stack}")
    else:
        print("All tags matched successfully!")

check_tags('c:/work/Capstone 2/MAP-SYSTEM/tts/frontend/src/pages/report/tabs/AgentTab.jsx')
