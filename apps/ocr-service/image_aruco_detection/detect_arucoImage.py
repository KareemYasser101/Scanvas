import cv2
import numpy as np
import os
import matplotlib.pyplot as plt
import sys
import itertools

def process_image(image_path, output_path):
    # Step 1: Load image
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError("Image not found at specified path.")

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Step 2: Detect ArUco markers
    aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    parameters = cv2.aruco.DetectorParameters()
    detector = cv2.aruco.ArucoDetector(aruco_dict, parameters)
    corners, ids, _ = detector.detectMarkers(gray)

    print("Found:", ids)
    if ids is None or len(ids) < 4:
        raise RuntimeError("Need 4 corner tags – found {}".format(0 if ids is None else len(ids)))

    # Step 3: Sort markers by position
    marker_positions = []
    for i, c in enumerate(corners):
        c = c[0]
        center = np.mean(c, axis=0)
        marker_positions.append((center, c))

    marker_positions = sorted(marker_positions, key=lambda x: (x[0][1], x[0][0]))
    top_two = sorted(marker_positions[:2], key=lambda x: x[0][0])
    bottom_two = sorted(marker_positions[2:], key=lambda x: x[0][0])

    top_left     = top_two[0][1][0]
    top_right    = top_two[1][1][1]
    bottom_right = bottom_two[1][1][2]
    bottom_left  = bottom_two[0][1][3]

    # Step 4: Perspective transform
    src_pts = np.array([top_left, top_right, bottom_right, bottom_left], dtype="float32")
    widthA = np.linalg.norm(bottom_right - bottom_left)
    widthB = np.linalg.norm(top_right - top_left)
    maxWidth = max(int(widthA), int(widthB))

    heightA = np.linalg.norm(top_right - bottom_right)
    heightB = np.linalg.norm(top_left - bottom_left)
    maxHeight = max(int(heightA), int(heightB))

    dst_pts = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]
    ], dtype="float32")

    M = cv2.getPerspectiveTransform(src_pts, dst_pts)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight), flags=cv2.INTER_CUBIC)

    # Save perspective-corrected image
    output_folder = os.path.dirname(output_path)
    os.makedirs(output_folder, exist_ok=True)
    cv2.imwrite(output_path, warped)
    print(f"✅ Perspective corrected image saved to: {output_path}")

    # Step 5: Extract only ID cells
    def extract_id_cells(warped_img):
        gray = cv2.cvtColor(warped_img, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)

        height, width = binary.shape
        horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (width // 30, 1))
        vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, height // 30))

        horizontal_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
        vertical_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel, iterations=2)

        grid = cv2.add(horizontal_lines, vertical_lines)
        contours, _ = cv2.findContours(grid, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

        boxes = []
        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            if w > width * 0.02 and h > height * 0.02 and w < width * 0.95 and h < height * 0.95:
                boxes.append((x, y, w, h))

        # Sort top to bottom
        boxes = sorted(boxes, key=lambda b: b[1])
        rows_grouped = []
        current_row = [boxes[0]]
        y_threshold = 10

        for b in boxes[1:]:
            if abs(b[1] - current_row[-1][1]) < y_threshold:
                current_row.append(b)
            else:
                rows_grouped.append(current_row)
                current_row = [b]
        rows_grouped.append(current_row)

        # Sort each row left to right
        rows_grouped = [sorted(row, key=lambda b: b[0]) for row in rows_grouped]

        # Extract last 8 cells from each row (ID cells)
        id_cols = 8
        id_cells = list(itertools.chain.from_iterable(
            row[-id_cols:] for row in rows_grouped if len(row) >= id_cols
        ))

        debug_img = warped_img.copy()
        for idx, (x, y, w, h) in enumerate(id_cells):
            cv2.rectangle(debug_img, (x, y), (x + w, y + h), (0, 255, 0), 2)
            cv2.putText(debug_img, str(idx + 1), (x + 4, y + 15),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 0, 0), 1)

        return debug_img, id_cells

    grid_image, id_cells = extract_id_cells(warped)
    print(f"✅ Extracted {len(id_cells)} ID cells.")

    # Save debug image with ID boxes overlay
    grid_output = os.path.join(output_folder, "id_grid_detected.png")
    cv2.imwrite(grid_output, grid_image)
    print(f"✅ ID grid overlay saved to: {grid_output}")

    # Save extracted ID cell images
    output_cells_folder = os.path.join(output_folder, "extracted_id_cells")
    os.makedirs(output_cells_folder, exist_ok=True)

    for idx, (x, y, w, h) in enumerate(id_cells):
        cell_img = warped[y:y + h, x:x + w]
        cell_filename = os.path.join(output_cells_folder, f"id_cell_{idx + 1:03d}.png")
        cv2.imwrite(cell_filename, cell_img)

    print(f"✅ Saved {len(id_cells)} ID cell images to: {output_cells_folder}")


# Script entry point
if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python detect_arucoImage.py input_image output_image")
        sys.exit(1)

    input_image = sys.argv[1]
    output_image = sys.argv[2]
    process_image(input_image, output_image)
