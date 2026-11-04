import PressableWithoutFeedback from '@components/Pressable/PressableWithoutFeedback';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React, {useState} from 'react';

import type CenteredModalLayoutOverlayProps from './types';

/** On native the navigation `Overlay` can't back the modal, so we render a plain full-screen Pressable behind the card. */
function CenteredModalLayoutOverlay({onBackdropPress}: CenteredModalLayoutOverlayProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const [isDismissing, setIsDismissing] = useState(false);

    const handlePress = () => {
        if (isDismissing) {
            return;
        }
        setIsDismissing(true);
        onBackdropPress();
    };

    return (
        <PressableWithoutFeedback
            onPress={handlePress}
            style={styles.fullScreen}
            accessibilityLabel={translate('common.close')}
            role={CONST.ROLE.BUTTON}
            id={CONST.OVERLAY.TOP_BUTTON_NATIVE_ID}
            tabIndex={-1}
            sentryLabel="CenteredModalLayout-backdrop"
            pointerEvents={isDismissing ? 'none' : 'auto'}
        />
    );
}

export default CenteredModalLayoutOverlay;
