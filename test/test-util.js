import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import VCard from 'vcfer'
import fs from 'fs'
import path from 'path'

export const loadCard = cardName => {
	const file = fs.readFileSync(
		path.join(__dirname, '/data/', cardName + '.vcf')
	)
	return new VCard(file)
}

/**
 * @param {(card: VCard, index: number) => Promise<void>} fn
 */
export const doForAllCards = async fn => {
	const files = fs.readdirSync(path.join(__dirname, '/data/'))
	return await Promise.all(
		files.map(async (fname, index) => {
			const file = fs.readFileSync(path.join(__dirname, '/data/', fname))
			const card = new VCard(file)
			return await fn(card, index)
		})
	)
	// files.forEach(fname => {
	// 	const file = fs.readFileSync(path.join(__dirname,'/data/', fname));
	// 	const card = new vCard().parse(file);
	// 	expect(() => fn(card)).not.toThrow();

	// });
}

/**
 * Fires an `input` dom event and changes the value of an input field.
 *
 * @param {HTMLElement} inputElement
 * @param {string} value
 */
export const changeInputValue = (inputElement, value) => {
	fireEvent.change(inputElement, { target: { value } })
}
