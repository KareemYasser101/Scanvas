import os
from image_preprocessing.extract_cells import process_image
from keras.models import load_model
import numpy as np
import cv2

# Get the absolute path to the model file
current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_dir, '..', 'MNIST_Model', 'attendance_digit_model_original_modified.h5')

try:
    # Try loading with compile=False first
    model = load_model(model_path, compile=False)
except Exception as e:
    print(f"Error loading model: {e}")
    raise

def predict(image):
    cleaned_cells, num_markers, error = process_image(image)
    if ((error is not None) and (num_markers != 4)) or (len(cleaned_cells) != 184):
        print(f"Error: {error}")
        return False
    else:
        # ✅ Add these lines:
        cleaned_cells = np.expand_dims(cleaned_cells, axis=-1)  # Now shape becomes (N, 28, 28, 1)
        cleaned_cells = cleaned_cells.astype("float32") / 255.0  # Normalize
        idArray = []
        predicted_digits = np.argmax(model.predict(cleaned_cells), axis=1)
        
        # Convert digits to strings and join them
        digits_str = ''.join(map(str, predicted_digits))
        
        # Split into groups of 8 digits and format each group
        for i in range(0, len(digits_str), 8):
            group = digits_str[i:i+8]
            if len(group) == 8:  # Only process complete groups
                formatted_id = f"{group[:2]}-{group[2:]}"
                idArray.append(formatted_id)

        print(idArray)
        
        return idArray