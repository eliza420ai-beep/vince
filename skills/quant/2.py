import numpy as np


def brier_score(predictions, outcomes):
    """Evaluate simulation calibration."""
    return np.mean((np.array(predictions) - np.array(outcomes))**2)

if __name__ == "__main__":
    # Compare two models
    model_A_preds = [0.7, 0.3, 0.9, 0.1]  # sharp, confident
    model_B_preds = [0.5, 0.5, 0.5, 0.5]  # always uncertain
    actual_outcomes = [1, 0, 1, 0]

    print(f"Model A Brier: {brier_score(model_A_preds, actual_outcomes):.4f}")  # 0.05
    print(f"Model B Brier: {brier_score(model_B_preds, actual_outcomes):.4f}")  # 0.25