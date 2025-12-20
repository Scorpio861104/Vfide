import os

def replace_in_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    new_content = content.replace('"contracts/', '"contracts-min/')
    new_content = new_content.replace("'contracts/", "'contracts-min/")
    
    if content != new_content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

def main():
    test_dir = '/workspaces/Vfide/test'
    for root, dirs, files in os.walk(test_dir):
        for file in files:
            if file.endswith('.js'):
                replace_in_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
