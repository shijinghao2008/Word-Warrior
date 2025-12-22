
from PIL import Image
import sys

def convert_black_to_transparent(input_path, output_path):
    try:
        img = Image.open(input_path)
        img = img.convert("RGBA")
        datas = img.getdata()

        new_data = []
        for item in datas:
            # Change all black (also nearly black) pixels to transparent
            # Adjust threshold if needed, but for pixel art pure black is usually safe
            if item[0] < 10 and item[1] < 10 and item[2] < 10:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)

        img.putdata(new_data)
        img.save(output_path, "PNG")
        print(f"Successfully converted {input_path} to {output_path}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python fix_transparency.py <input> <output>")
    else:
        convert_black_to_transparent(sys.argv[1], sys.argv[2])
