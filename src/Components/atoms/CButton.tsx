import {
    ActivityIndicator,
    ColorValue,
    DimensionValue,
    Pressable,
    PressableProps,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
    View,
    ViewStyle,
} from 'react-native';
import React from 'react';
import { StyleArgs } from '../../utils/types';
import CText from './CText';
import { textStyle } from '../../utils/helpers';
import { useTheme } from '@react-navigation/native';
import { isIos, LightTheme } from '../../utils/constants';
import useStyleArgs from '../../hooks';

interface CButtonProps extends PressableProps {
    width?: DimensionValue;
    title: string;
    loading?: boolean;
    backgroundColor?: ColorValue;
    color?: ColorValue;
    style?: StyleProp<ViewStyle>;
    btnContainer?: StyleProp<ViewStyle>;
    adjustsFontSizeToFit?: boolean;
    textStyle?: TextStyle;
    activityIndicatorColor?: string;
}
const CButton = (props: CButtonProps) => {
    const styles = useStyleArgs(styleHandler);

    return (
        <Pressable
            {...props}
            style={[
                {
                    width: props.width ?? '100%',
                    alignSelf: 'center',
                },
                props.style,
                props.disabled && styles.disable,
            ]}>
            <View
                style={styles.container}
            >
                {props.loading ? (
                    <ActivityIndicator color={props.activityIndicatorColor ?? 'white'} />
                ) : (
                    <CText
                        numberOfLines={props.adjustsFontSizeToFit ? 1 : undefined}
                        adjustsFontSizeToFit={props.adjustsFontSizeToFit}
                        style={[
                            styles.text,
                            props.textStyle,
                            { color: props.color ?? styles.text.color },
                            props.disabled && styles.disableText,
                        ]}>
                        {props.title}
                    </CText>
                )}
            </View>
        </Pressable>
    );
};

export default CButton;

const styleHandler = ({ dims, insets, theme: { colors } }: StyleArgs) =>
    StyleSheet.create({
        container: {
            flexDirection: 'row',
            width: '100%',
            paddingHorizontal: dims.width * 0.04,
            paddingVertical: dims.height * 0.013,
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.buttonBackground
        },
        disable: {
            backgroundColor: colors.placeholderColor,
        },

        text: {
            ...textStyle(14, '600', colors.white),
            textAlign: 'center',
            color: colors.white
        },
        disableText: {
            ...textStyle(16, '600', colors.placeholderColor),
        },
    });
