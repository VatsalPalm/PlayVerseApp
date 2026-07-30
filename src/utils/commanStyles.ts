import { StyleSheet } from 'react-native';
import { StyleArgs } from './types';
import { textStyle } from './helpers';

export const CommanStyleHandler = ({
    dims,
    insets,
    theme: { colors },
}: StyleArgs) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        flexGrowContainer: {
            flexGrow: 1,
        },
        flex1: {
            flex: 1,
        },
        flex1WithPadding: {
            flex: 1,
            top: insets.top,
        },
        containerCenter: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        alignCenter: {
            alignItems: 'center',
        },
        alignAndJustifyCenter: {
            alignItems: 'center',
            justifyContent: 'center',
        },
        rowFlex: {
            flexDirection: 'row',
        },
        serif16px600: {
            ...textStyle(16, '600', colors.white),
        },
        serif15px600: {
            ...textStyle(15, '600', colors.white),
        },
        margincontainer: {
            marginHorizontal: dims.width * 0.05,
        },
        arabicTextAlign: {
            textAlign: 'right',
        },
        arabicFlexAlignItems: {
            alignItems: 'flex-end',
        },
        arabicFlexAlignAndJustifyItems: {
            alignItems: 'flex-end',
            justifyContent: 'center',
        },
    });
