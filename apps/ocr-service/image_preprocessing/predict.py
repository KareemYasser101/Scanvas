from image_preprocessing.extract_cells import process_image
from tensorflow.keras.models import load_model 
model = load_model('../MNIST_Model/latest_model.keras')

def predict(image):
    cleaned_cells, num_markers, error = process_image(image)
    if ((error is not None) and (num_markers != 4)) or (len(cleaned_cells) != 184):
        print(f"Error: {error}")
        return False
    else:
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
        
        return idArray