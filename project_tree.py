import os

def print_tree(startpath, max_depth=5, ignore_hidden=True):
    output = []
    start_depth = startpath.rstrip(os.sep).count(os.sep)

    for root, dirs, files in os.walk(startpath):
        current_depth = root.count(os.sep) - start_depth
        if current_depth > max_depth:
            continue

        # Filter out hidden folders and node_modules
        if ignore_hidden:
            dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'node_modules']
            files = [f for f in files if not f.startswith('.')]
        else:
            dirs[:] = [d for d in dirs if d != 'node_modules']

        indent = '│   ' * current_depth
        folder_name = os.path.basename(root)
        output.append(f"{indent}📁 {folder_name}")

        for f in files:
            output.append(f"{indent}-> {f}")

    return "\n".join(output)

# === CHANGE THIS TO YOUR PROJECT FOLDER PATH ===
project_path = r"D:\Documents\Code\Python\video conferencing"

project_structure = print_tree(project_path)

# Save to a text file so you can use it later
with open("project_structure.txt", "w", encoding="utf-8") as f:
    f.write(project_structure)

print("Project structure saved to 'project_structure.txt'")
