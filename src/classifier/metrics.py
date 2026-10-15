import numpy as np

def compute_classification_metrics(y_true, y_pred, class_names=None):
    """
    Computes confusion matrix, accuracy, macro/weighted precision, recall, F1,
    and per-class metrics without external library dependencies.
    y_true: 1D array-like of true class indices
    y_pred: 1D array-like of predicted class indices
    """
    y_true = np.asarray(y_true, dtype=np.int64)
    y_pred = np.asarray(y_pred, dtype=np.int64)
    
    if class_names is None:
        num_classes = max(y_true.max(), y_pred.max()) + 1
        class_names = [f"Class {i}" for i in range(num_classes)]
    else:
        num_classes = len(class_names)
        
    cm = np.zeros((num_classes, num_classes), dtype=np.int64)
    for t, p in zip(y_true, y_pred):
        if 0 <= t < num_classes and 0 <= p < num_classes:
            cm[t, p] += 1
            
    total_samples = len(y_true)
    correct = np.trace(cm)
    accuracy = float(correct / total_samples) if total_samples > 0 else 0.0
    
    per_class = {}
    precisions = []
    recalls = []
    f1s = []
    supports = []
    
    for i in range(num_classes):
        tp = float(cm[i, i])
        fp = float(np.sum(cm[:, i]) - tp)
        fn = float(np.sum(cm[i, :]) - tp)
        support = int(np.sum(cm[i, :]))
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2.0 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        
        precisions.append(precision)
        recalls.append(recall)
        f1s.append(f1)
        supports.append(support)
        
        per_class[class_names[i]] = {
            "precision": float(precision),
            "recall": float(recall),
            "f1": float(f1),
            "support": support
        }
        
    macro_precision = float(np.mean(precisions))
    macro_recall = float(np.mean(recalls))
    macro_f1 = float(np.mean(f1s))
    
    weights = np.array(supports, dtype=np.float64)
    w_sum = np.sum(weights)
    if w_sum > 0:
        weighted_precision = float(np.sum(np.array(precisions) * weights) / w_sum)
        weighted_recall = float(np.sum(np.array(recalls) * weights) / w_sum)
        weighted_f1 = float(np.sum(np.array(f1s) * weights) / w_sum)
    else:
        weighted_precision = 0.0
        weighted_recall = 0.0
        weighted_f1 = 0.0
        
    return {
        "accuracy": accuracy,
        "macro_precision": macro_precision,
        "macro_recall": macro_recall,
        "macro_f1": macro_f1,
        "weighted_precision": weighted_precision,
        "weighted_recall": weighted_recall,
        "weighted_f1": weighted_f1,
        "per_class": per_class,
        "confusion_matrix": cm.tolist()
    }
