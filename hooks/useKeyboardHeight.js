import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * Current keyboard height in px (0 when hidden). Works on iOS + Android
 * for lifting bottom inputs above the keyboard.
 */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e) => {
      const h = e?.endCoordinates?.height;
      setHeight(typeof h === "number" ? h : 0);
    };
    const onHide = () => setHeight(0);

    const subShow = Keyboard.addListener(showEvt, onShow);
    const subHide = Keyboard.addListener(hideEvt, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  return height;
}
