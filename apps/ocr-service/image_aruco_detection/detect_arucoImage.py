import cv2
import numpy as np
import os
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

    def clean_and_rebuild_cell(cropped):
        gray = cv2.cvtColor(cropped, cv2.COLOR_BGR2GRAY)

        # Adaptive threshold to binarize
        binary = cv2.adaptiveThreshold(
            gray, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV,
            blockSize=11, C=10
        )

        coords = cv2.findNonZero(binary)
        if coords is None:
            return np.zeros((28, 28), dtype=np.uint8)

        x, y, w, h = cv2.boundingRect(coords)
        digit = binary[y:y + h, x:x + w]

        # Resize to 20x20 (preserving aspect ratio)
        if w > h:
            new_w = 20
            new_h = int(h * (20.0 / w))
        else:
            new_h = 20
            new_w = int(w * (20.0 / h))

        resized = cv2.resize(digit, (new_w, new_h), interpolation=cv2.INTER_AREA)

        # Place in 28x28 black canvas
        padded = np.zeros((28, 28), dtype=np.uint8)
        x_offset = (28 - new_w) // 2
        y_offset = (28 - new_h) // 2
        padded[y_offset:y_offset + new_h, x_offset:x_offset + new_w] = resized

        # Apply dilation to thicken
        kernel = np.ones((2, 2), np.uint8)
        dilated = cv2.dilate(padded, kernel, iterations=1)

        # Apply Gaussian blur to smooth
        smoothed = cv2.GaussianBlur(dilated, (3, 3), sigmaX=0.5)

        return smoothed


    # === Extract cells ===
    grid_image, id_cells = extract_id_cells(warped)
    print(f"✅ Extracted {len(id_cells)} ID cells.")

    # Save debug grid image
    grid_output = os.path.join(output_folder, "id_grid_detected.png")
    cv2.imwrite(grid_output, grid_image)
    print(f"✅ ID grid overlay saved to: {grid_output}")

    # Output folders
    final_output_folder = os.path.join(output_folder, "final_clean_cells")
    raw_output_folder = os.path.join(output_folder, "raw_cells")
    os.makedirs(final_output_folder, exist_ok=True)
    os.makedirs(raw_output_folder, exist_ok=True)

    for idx, (x, y, w, h) in enumerate(id_cells):
        margin = 4
        x1 = max(x + margin, 0)
        y1 = max(y + margin, 0)
        x2 = min(x + w - margin, warped.shape[1])
        y2 = min(y + h - margin, warped.shape[0])

        cell_img = warped[y1:y2, x1:x2]

        # Save raw cell
        raw_path = os.path.join(raw_output_folder, f"id_cell_{idx + 1:03d}.png")
        cv2.imwrite(raw_path, cell_img)

        # Save cleaned cell
        clean_img = clean_and_rebuild_cell(cell_img)
        final_path = os.path.join(final_output_folder, f"id_cell_{idx + 1:03d}.png")
        cv2.imwrite(final_path, clean_img)

    print(f"✅ Raw cells saved to: {raw_output_folder}")
    print(f"✅ Cleaned digit cells saved to: {final_output_folder}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python detect_arucoImage.py input_image output_image")
        sys.exit(1)

    input_image = sys.argv[1]
    output_image = sys.argv[2]
    process_image(input_image, output_image)
